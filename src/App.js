import "./App.css";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import LitJsSdk from "lit-js-sdk";
import axios from "axios";
import abi from "./contracts/abi.js";
import addresses from "./contracts/addresses.js";
import SwitchView from "./components/SwitchView";
import SealSecret from "./components/SealSecret";
import WalletNavbar from "./components/WalletNavbar";
import ViewSecrets from "./components/ViewSecrets";
import "bootstrap/dist/css/bootstrap.min.css";
import { Card } from "react-bootstrap";
import ConnectButton from "./components/ConnectWallet";

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
  data.append("file", file, {
    filename: "encryptedString.bin",
    contentType: "application/octet-stream",
  });
  const metadata = JSON.stringify({
    name: `${sender}_${receiver}_encryptedString`,
  });
  data.append("pinataMetadata", metadata);
  return axios.post(url, data, {
    maxBodyLength: "Infinity", //this is needed to prevent axios from erroring out with large files
    headers: {
      "Content-Type": "multipart/form-data",
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
  const [isSendingSecret, setIsSendingSecret] = useState(true);
  const [provider, setProvider] = useState();
  const [isValidNetwork, setIsValidNetwork] = useState();
  const [signer, setSigner] = useState();
  const [account, setAccount] = useState();
  const [isConnected, setIsConnected] = useState();
  const [litClient, setLitClient] = useState();
  const [litConnected, setLitConnected] = useState(false);
  const [authKey, setAuthKey] = useState();
  const [ssoInstance, setSsoInstance] = useState();
  const [receivedSecrets, setReceivedSecrets] = useState();
  const [addedListeners, setAddedListeners] = useState(false);

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
    setLitConnected(true);
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
        const receivedSecrets = await Promise.all(
          queries.map(async (query) => {
            const url = await ssoInstance.tokenURI(
              query.args.receiverTokenId.toString()
            );
            const metadata = (
              await axios.get(`https://ipfs.io/ipfs/${url.slice(6)}`)
            ).data;
            return {
              metadata: metadata,
              sender: query.args.sender,
              senderSecretId: query.args.senderTokenId.toString(),
              receiver: query.args.receiver,
              secretId: query.args.receiverTokenId.toString(),
            };
          })
        );
        if (!litConnected) {
          await connectLit();
        }
        if (!addedListeners) {
          window.ethereum.on("accountsChanged", (accounts) => connectWallet());
          window.ethereum.on("chainChanged", (chainId) => {
            connectWallet();
          });
          setAddedListeners(true);
        }
        setReceivedSecrets(receivedSecrets);
        setSsoInstance(ssoInstance);
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

  const sealSecret = async (receiver, message, title) => {
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

  const revealSecret = async (secret) => {
    const metadata = secret.metadata;
    const encryptString = await axios({
      url: `https://ipfs.io/ipfs/${metadata.secret.encryptedStringHash}`,
      method: `get`,
      responseType: `blob`,
    });
    return await decrypt(
      metadata.secret.accessControlConditions,
      Uint8Array.from(Object.values(metadata.secret.encryptedSymmetricKey)),
      encryptString.data
    );
  };

  useEffect(() => {
    setProvider(initialiseProvider());
  }, []);

  return (
    <div className="App">
      <WalletNavbar
        connectWallet={connectWallet}
        isConnected={isConnected}
        account={account}
      />
      {!isConnected ? (
        <div className="justify-content-center">
          <Card style={{ maxWidth: "450px" , marginLeft: "auto",marginRight: "auto", marginTop: "5rem"}}>
              <Card.Header>
                <ConnectButton variant={"primary"} connectWallet={connectWallet} />
              </Card.Header>
            </Card>
        </div>
      ) : (
        <div className="justify-content-center">
            <Card style={{ maxWidth: "450px" , marginLeft: "auto",marginRight: "auto", marginTop: "5rem"}}>
              <Card.Header>
                <SwitchView setIsSendingSecret={setIsSendingSecret} />
              </Card.Header>
              <Card.Body>
                {isSendingSecret ? (
                  <>
                    <Card.Title>Seal Secret</Card.Title>
                    <Card.Text>
                      <SealSecret sealSecret={sealSecret} />
                    </Card.Text>
                  </>
                ) : (
                  <>
                    <Card.Title>Reveal Secret</Card.Title>
                    <Card.Text>
                      <ViewSecrets
                        revealSecret={revealSecret}
                        receivedSecrets={receivedSecrets}
                      />
                    </Card.Text>
                  </>
                )}
              </Card.Body>
            </Card>
        </div>
      )}
    </div>
  );
}

export default App;
