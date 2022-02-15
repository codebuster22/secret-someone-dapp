import { useState } from "react";
import { Card, CardGroup, Button } from "react-bootstrap";

const ViewSecrets = ({ revealSecret, receivedSecrets, ssoInstance }) => {
  const renderSecrets = () => {
    return receivedSecrets.map((secret) => (
      <SecretCard
        key={secret.secretId}
        secret={secret}
        revealSecret={revealSecret}
      />
    ));
  };
  return (
    <>
      <CardGroup>{renderSecrets()}</CardGroup>
    </>
  );
};

const SecretCard = ({ secret, revealSecret }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealedMessage, setRevealedMessage] = useState();

  const reveal = async () => {
    setIsRevealing(true);
    const revealedMessage = await revealSecret(secret);
    setRevealedMessage(revealedMessage);
    setIsRevealed(true);
    setIsRevealing(false);
  };

  const hide = async () => {
    setIsRevealed(false);
    setRevealedMessage(undefined);
  };

  return (
    <Card key={secret.secretId} style={{ maxWidth: "400px" }}>
      <Card.Img
        variant="top"
        style={{ maxHeight: "300px" }}
        src={`https://ipfs.io/ipfs/${secret.metadata.image.slice(6)}`}
      />
      <Card.Body>
        <Card.Title>{secret.metadata.name}</Card.Title>
        <Card.Text>
          {!isRevealed ? "******************************" : revealedMessage}
        </Card.Text>
        {isRevealed ? (
          <Button onClick={hide} variant="primary">
            Hide Secret!
          </Button>
        ) : (
          <Button onClick={reveal} variant="primary">
            {isRevealing ? "Revealing..." : "Reveal Secret!"}
          </Button>
        )}
      </Card.Body>
      <Card.Footer>
        <small className="text-muted">Sent by {secret.sender}</small>
      </Card.Footer>
    </Card>
  );
};

export default ViewSecrets;
