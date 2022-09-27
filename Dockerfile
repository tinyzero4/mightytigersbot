FROM node:18-alpine
LABEL maintainer="breedish@gmail.com"

WORKDIR /opt/mightytigers

COPY dist /opt/mightytigers
COPY cert/aws /opt/mightytigers
CMD ["npm", "run-script", "run-dist"]
