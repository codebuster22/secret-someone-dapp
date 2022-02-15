import { useState } from "react";
import { Nav } from "react-bootstrap";

const SwitchView = ({ setIsSendingSecret }) => {
  const [activeKey, setActiveKey] = useState(1);
  const handleSelect = (eventKey) => {
    setActiveKey(eventKey);
    if(eventKey == 1) {
      setIsSendingSecret(true);
    } else {
      setIsSendingSecret(false)
    }
  }
  return (
    <>
    <Nav variant="pills" activeKey={activeKey} className="justify-content-center" onSelect={handleSelect}>
    <Nav.Item>
      <Nav.Link eventKey={"1"} >Seal</Nav.Link>
    </Nav.Item>
    <Nav.Item>
      <Nav.Link eventKey={"2"} >Reveal</Nav.Link>
    </Nav.Item>
  </Nav>
    </>
  );
};

export default SwitchView;
