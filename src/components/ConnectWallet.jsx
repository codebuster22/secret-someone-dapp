import { useState } from "react";
import {Button} from 'react-bootstrap';

const ConnectButton = ({variant,connectWallet}) => {
    const [isConnecting, setIsConnecting] = useState(false);
    const connect = async () => {
      setIsConnecting(true);
      await connectWallet();
      setIsConnecting(false);
    }
    return (
      <Button type="button" variant={variant} onClick={connect} >{isConnecting?"Connecting...":"Connect Wallet"}</Button>
    )
  }

  export default ConnectButton;