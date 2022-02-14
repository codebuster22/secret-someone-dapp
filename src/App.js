import logo from "./logo.svg";
import "./App.css";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import LitJsSdk from "lit-js-sdk";
import axios from "axios";
import abi from "./contracts/abi.js";
import addresses from "./contracts/addresses.js";

const network = process.env.REACT_APP_NETWORK;

const chain = network === "mainnet" ? "ethereum" : "rinkeby";

const getAccessControlConditions = (reader) => {
  return [
    {
      contractAddress: "",
      standardContractType: "",
      chain: chain,
      method: "",
      parameters: [":userAddress"],
      returnValueTest: {
        comparator: "=",
        value: reader,
      },
    },
  ];
};

const pinJson = async (JSONBody) => {
  const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
  return (
    await axios.post(url, JSONBody, {
      headers: {
        pinata_api_key: process.env.REACT_APP_PINATA_API_Key,
        pinata_secret_api_key: process.env.REACT_APP_PINATA_API_Secret,
      },
    })
  ).data.IpfsHash;
};

const pinFile = async (file, sender, receiver) => {
  const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
  let data = new FormData();
  data.append( 'file', file, {
    filename:    'encryptedString.bin',
    contentType: 'application/octet-stream',
} );
  const metadata = JSON.stringify({
    name: `${sender}_${receiver}_encryptedString`,
  });
  data.append("pinataMetadata", metadata);
  return axios.post(url, data, {
    maxBodyLength: "Infinity", //this is needed to prevent axios from erroring out with large files
    headers: {
      "Content-Type": 'multipart/form-data',
      pinata_api_key: process.env.REACT_APP_PINATA_API_Key,
      pinata_secret_api_key: process.env.REACT_APP_PINATA_API_Secret,
    },
  });
};

const generateSecret = (
  sender,
  receiver,
  title = `Secret for ${receiver}`,
  accessControlConditions,
  encryptedSymmetricKey,
  encryptedStringHash
) => {
  return {
    description: `A secret was sealed between ${sender} and ${receiver} on ${Date.now()}`,
    name: title,
    external_url: "https://secretsomeone.xyz/",
    image: "ipfs://QmUoHwYKUVdUuXTKUSMQGW1g4Sovbuztm9rQ33y4pdJ5Xm",
    image_description: "Photo by Folco Masi on Unsplash",
    secret: {
      accessControlConditions: accessControlConditions,
      encryptedSymmetricKey: encryptedSymmetricKey,
      encryptedStringHash: encryptedStringHash,
    },
    attributes: [
      {
        display_type: "date",
        trait_type: "sealed on",
        value: Math.floor(Date.now() / 1000),
      },
      {
        trait_type: "sender",
        value: sender,
      },
      {
        trait_type: "receiver",
        value: receiver,
      },
    ],
  };
};

function App() {
  const [isSendingSecret, setIsSendingSecret] = useState();
  const [provider, setProvider] = useState();
  const [isValidNetwork, setIsValidNetwork] = useState();
  const [signer, setSigner] = useState();
  const [account, setAccount] = useState();
  const [isConnected, setIsConnected] = useState();
  const [litClient, setLitClient] = useState();
  const [authKey, setAuthKey] = useState();
  const [ssoInstance, setSsoInstance] = useState();
  const [receivedSecrets, setReceivedSecrets] = useState();

  const [receiver, setReceiver] = useState();
  const [message, setMessage] = useState();
  const [title, setTitle] = useState();

  const [secret, setSecret] = useState();
  const [hash, setHash] = useState();

  const initialiseProvider = () => {
    setIsValidNetwork(true);
    return ethers.getDefaultProvider(network);
  };

  const connectLit = async () => {
    const client = new LitJsSdk.LitNodeClient();
    await client.connect();
    setLitClient(client);
    const auth = await LitJsSdk.checkAndSignAuthMessage({ chain: chain });
    setAuthKey(auth);
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const connectedNetwork =
        (await provider.getNetwork())?.chainId === 1 ? "mainnet" : "rinkeby";
      const isValidNetwork = connectedNetwork == network;
      if (isValidNetwork) {
        const signer = provider.getSigner();
        const [account] = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        const ssoInstance = new ethers.Contract(
          addresses[network],
          abi,
          provider
        );
        const filter = ssoInstance.filters.SecretSealed(null, account);
        const queries = await ssoInstance.queryFilter(filter);
        const receivedSecrets = queries.map((query) => ({
          sender: query.args.sender,
          secretId: query.args.receiverTokenId.toString(),
        }));
        setReceivedSecrets(receivedSecrets);
        setSsoInstance(ssoInstance);
        await connectLit();
        setProvider(provider);
        setSigner(signer);
        setAccount(account);
        setIsConnected(true);
        setIsValidNetwork(true);
      } else {
        setIsValidNetwork(false);
        alert(`Wrong network selected. Please connect to ${network}`);
      }
    }
  };

  const sealSecret = async () => {
    if (isConnected) {
      if (
        account.toLowerCase() != receiver.toLowerCase() &&
        ethers.utils.isAddress(receiver)
      ) {
        const { encryptedString, symmetricKey } = await LitJsSdk.encryptString(
          message
        );
        const accessControlConditions = getAccessControlConditions(receiver);
        const encryptedSymmetricKey = await litClient.saveEncryptionKey({
          accessControlConditions,
          symmetricKey,
          authSig: authKey,
          chain: chain,
        });
        const encryptedStringHash = (await pinFile(encryptedString)).data
          .IpfsHash;
        console.log(encryptedSymmetricKey);
        const secret = generateSecret(
          account,
          receiver,
          title,
          accessControlConditions,
          encryptedSymmetricKey,
          encryptedStringHash
        );
        const hash = await pinJson(secret);
        const tx = await ssoInstance.connect(signer).sendSecret(receiver, hash);
        tx.wait().then((receipt) => {
          alert(
            `Secret sealed at ${hash} in transaction ${receipt.transactionHash}`
          );
          setSecret(secret);
          setHash(hash);
        });
      } else {
        alert("Don't be that loner!");
      }
    } else {
      alert("Connect Wallet");
    }
  };

  const decrypt = async (
    accessControlConditions,
    encryptedMessage,
    encryptedString
  ) => {
    const symmetricKey = await litClient.getEncryptionKey({
      accessControlConditions,
      toDecrypt: LitJsSdk.uint8arrayToString(encryptedMessage, "base16"),
      chain: chain,
      authSig: authKey,
    });
    const decryptedString = await LitJsSdk.decryptString(
      encryptedString,
      symmetricKey
    );
    return decryptedString;
  };

  const handleReceiver = (event) => {
    setReceiver(event.target.value);
  };

  const handleMessage = (event) => {
    setMessage(event.target.value);
  };

  const handleTitle = (event) => {
    setTitle(event.target.value);
  };

  const renderSecrets = () => {
    return receivedSecrets.map((secret) => (
      <p key={secret.secretId}>
        Sender:{secret.sender} Secret ID:{secret.secretId}
      </p>
    ));
  };

  const revealSecret = async () => {
    const secretId = receivedSecrets[0].secretId;
    const url = await ssoInstance.tokenURI(secretId);
    const metadata = (await axios.get(`https://ipfs.io/ipfs/${url.slice(6)}`))
      .data;
    const encryptString = await axios({
      url: `https://ipfs.io/ipfs/${metadata.secret.encryptedStringHash}`,
      method: `get`,
      responseType: `blob`}
    );
    alert(
      await decrypt(
        metadata.secret.accessControlConditions,
        Uint8Array.from(Object.values(metadata.secret.encryptedSymmetricKey)),
        encryptString.data
      )
    );
  };

  useEffect(() => {
    setProvider(initialiseProvider());
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        {!isConnected ? (
          <button onClick={connectWallet}>Connect Wallet</button>
        ) : (
          <>
            <button onClick={() => setIsSendingSecret(true)}>
              Send Secret
            </button>
            <button onClick={() => setIsSendingSecret(false)}>
              Read Secret
            </button>
            {isSendingSecret ? (
              <>
                <input
                  type={"text"}
                  placeholder={"A secret to my ..."}
                  value={title}
                  name={"title"}
                  onChange={handleTitle}
                />
                <input
                  type={"text"}
                  placeholder={"sshhh, it's a secret!!"}
                  value={message}
                  name={"message"}
                  onChange={handleMessage}
                />
                <input
                  type={"text"}
                  placeholder={"0xdEAf69..."}
                  value={receiver}
                  name={"receiver"}
                  onChange={handleReceiver}
                />
                <button onClick={sealSecret}>Seal Secret</button>
              </>
            ) : (
              <>
                {renderSecrets()}
                <button onClick={revealSecret}>Reveal Secret</button>
              </>
            )}
          </>
        )}
      </header>
    </div>
  );
}

export default App;
