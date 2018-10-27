FROM node:10.1.0
ENV NODE_ENV production
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules ../
COPY . .
EXPOSE 30399:30399/tcp
EXPOSE 30399:30399/udp
EXPOSE 8099:8099
CMD npm start