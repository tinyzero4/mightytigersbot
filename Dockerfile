FROM node:10.4.0-alpine
LABEL maintainer="breedish@gmail.com"

WORKDIR /opt/mightytigers

COPY dist /opt/mightytigers
COPY infrastructure/cert /opt/mightytigers
CMD ["npm", "run-script", "run-dist"]