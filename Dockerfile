FROM node:boron

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
RUN npm install --production
RUN npm install pm2 -g

# Bundle app source
COPY . /usr/src/app

EXPOSE 1337

CMD [ "pm2-docker", "/usr/src/app/bin/corsproxy" ]