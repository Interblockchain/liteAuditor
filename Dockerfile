FROM node:10.1.0
ENV NODE_ENV production
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules ../
COPY . .
EXPOSE 20399:20399/tcp
EXPOSE 20399:20399/udp
EXPOSE 8099:8099
CMD npm start