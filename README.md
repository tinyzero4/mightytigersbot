# Telegram Mightytigers bot

Bot provides interactive voting procedure for TigersTeam  

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

> Telegeram Bot should be configured and *BOT_TOKEN* obtained

> GCloud + K8S

Local environment:

- node, typescript
- docker, docker-compose
- gcloud + kubectl

## Development

To run local instance of bot:
```bash
node run-script run-local
```

### Running the tests

```bash
node run-script test
```

## Deployment

Package artifact, Build Docker image, Publish Docker image, Deploy Docker image to AWS instance

```bash
./build-and-deploy.sh
```

> docker login could be required to do before operation.

### Enable WebHook

```bash
curl -X POST \
  https://api.telegram.org/bot{BOT_TOKEN}/setWebhook \
  -H 'content-type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW' \
  -F url={BOT_ENDPOINT} \
  -F certificate=@path/to/certificate.pem
```

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details