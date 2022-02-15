import { useState } from "react";
import { Form, Button } from "react-bootstrap";

const SealSecret = ({ sealSecret }) => {
  const [receiver, setReceiver] = useState();
  const [message, setMessage] = useState();
  const [title, setTitle] = useState();

  const handleReceiver = (event) => {
    setReceiver(event.target.value);
  };

  const handleMessage = (event) => {
    setMessage(event.target.value);
  };

  const handleTitle = (event) => {
    setTitle(event.target.value);
  };
  return (
    <div>
      <Form style={{textAlign: 'left'}}>
        <Form.Group style={{marginTop: '10px'}} controlId="exampleForm.ControlInput1">
          <Form.Label>Title</Form.Label>
          <Form.Control
            type="text"
            placeholder="A secret to my ..."
            value={title}
            name={"title"}
            onChange={handleTitle}
          />
        </Form.Group>
        <Form.Group style={{marginTop: '10px'}} controlId="exampleForm.ControlTextarea1">
          <Form.Label>Message</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder={"sshhh, it's a secret!!"}
            value={message}
            name={"message"}
            onChange={handleMessage}
          />
        </Form.Group>
        <Form.Group style={{marginTop: '10px'}} controlId="exampleForm.ControlInput1">
          <Form.Label>Receiver Address</Form.Label>
          <Form.Control
            type="text"
            placeholder="0xdEAf69..."
            value={receiver}
            name={"receiver"}
            onChange={handleReceiver}
          />
        </Form.Group>
        <Form.Group  style={{marginTop: '10px', display: 'flex'}} className={'justify-content-center'} controlId="exampleForm.ControlInput1">
          <Button style={{marginLeft: 'auto', marginRight: 'auto'}}
            variant="primary"
            type="button"
            onClick={() => sealSecret(receiver, message, title)}
          >
            Seal it!
          </Button>
        </Form.Group>
      </Form>
    </div>
  );
};

export default SealSecret;
