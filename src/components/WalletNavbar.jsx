import { Navbar, Form, Button } from "react-bootstrap";
import ConnectButton from "./ConnectWallet";

const WalletNavbar = ({ connectWallet, isConnected, account }) => {
  return (
    <Navbar bg="dark" variant="dark">
      <Navbar.Brand className="mr-auto">Secret Someone</Navbar.Brand>
      <Form inline>
        {!isConnected ? (
          <ConnectButton variant={"light"} connectWallet={connectWallet}/>
        ) : (
            <Form.Control value={`${account.slice(0,8)}...${account.slice(-6)}`} disabled />
        )}
      </Form>
    </Navbar>
  );
};

export default WalletNavbar;
