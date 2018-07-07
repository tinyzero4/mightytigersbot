# Telegram Mightytigers bot

Bot provides interactive voting procedure for TigersTeam  

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

> Telegeram Bot should be configured and *BOT_TOKEN* obtained

> AWS is required for deployment, AWS CLI should be configured

Local environment:

- node, typescript
- docker, docker-compose
- ansible via pip (+ boto)
- terraform

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

1. Package artifact

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

## Contributing

Welcome!

## Versioning

We use [SemVer](http://semver.org/) for versioning.

## Authors

- breedish - initial work

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details