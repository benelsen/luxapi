FROM node:12

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ARG NODE_ENV
ENV NODE_ENV $NODE_ENV
COPY package.json /usr/src/app/
RUN npm install && npm cache verify
COPY vdl/ /usr/src/app/vdl/
COPY server.js /usr/src/app

EXPOSE 3000

CMD [ "npm", "start" ]
