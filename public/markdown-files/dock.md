# Creating a Docker Container

## Prerequisites
Before you start, ensure you have the following installed:
- [Docker](https://www.docker.com/get-started)

## Step 1: Create a Dockerfile
A `Dockerfile` is a script that contains instructions to build a Docker image.

Create a new file named `Dockerfile` and add the following content:
```dockerfile
# Use an official image as a base
FROM node:18

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy application source code
COPY . .

# Expose a port and define the start command
EXPOSE 3000
CMD ["npm", "start"]
```

## Step 2: Build the Docker Image
Run the following command in the directory containing the `Dockerfile`:
```sh
docker build -t my-app .
```
This will create a Docker image named `my-app`.

## Step 3: Run the Docker Container
To start a container from the newly built image, use:
```sh
docker run -d -p 3000:3000 --name my-container my-app
```
- `-d` runs the container in detached mode (in the background).
- `-p 3000:3000` maps port 3000 of the container to port 3000 of the host machine.
- `--name my-container` gives the container a custom name.

## Step 4: Verify the Running Container
To check if your container is running, execute:
```sh
docker ps
```

## Step 5: Stop and Remove the Container
To stop the container, run:
```sh
docker stop my-container
```
To remove the container:
```sh
docker rm my-container
```

## Step 6: Remove the Docker Image (Optional)
If you no longer need the image, remove it with:
```sh
docker rmi my-app
```

## Additional Commands
- View container logs:
  ```sh
  docker logs my-container
  ```
- Execute a command inside the running container:
  ```sh
  docker exec -it my-container sh
  ```

---
You now have a basic understanding of how to create, run, and manage a Docker container!

