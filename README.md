## Setup

1. Clone the repository:
  ```sh
  git clone https://github.com/permutize/kernel-network-test.git
  cd kernel-network-test
  ```

2. Create a `.env` file in the root directory of the repository and set up the following variables:
  ```env
  RPC_URL="https://rpc"
  BUNDLER_URL="https://bundler"
  PRIVATE_KEY="abcdef0123"
  ```

  - `RPC_URL`: This is the URL of the RPC node.
  - `BUNDLER_URL`: This is the URL of the bundler node.
  - `PRIVATE_KEY`: This is the private key of the account that will be used to send transactions (without the `0x` prefix).

3. Install the required dependencies:
  ```sh
  npm install
  ```

## Running the Script

To run the network test script, execute the following command:
```sh
npm run dev
```

or:
```sh
npm run build
npm start
```

