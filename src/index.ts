import 'dotenv/config';


import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator';
import { deserializePermissionAccount, serializePermissionAccount, toPermissionValidator } from '@zerodev/permissions';
import { toECDSASigner } from '@zerodev/permissions/signers';
import { addressToEmptyAccount, createKernelAccount, createKernelAccountClient } from '@zerodev/sdk';
import { createPublicClient, Hex, http, parseEther, zeroAddress } from 'viem';
import { Address, generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { toSudoPolicy } from '@zerodev/permissions/policies';
import { getEntryPoint, KERNEL_V3_1 } from '@zerodev/sdk/constants';

const userPrivateKey = `0x${process.env.PRIVATE_KEY}` as Hex;
const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
const bundlerUrl = process.env.BUNDLER_URL || 'http://localhost:8545';

const kernelVersion = KERNEL_V3_1;
const entryPoint = getEntryPoint('0.7');
const chain = {
  id: 41454,
  name: 'monad-devnet',
  nativeCurrency: {
    name: 'MONAD',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [rpcUrl],
    },
  },
};

const serviceAccount = privateKeyToAccount(generatePrivateKey());

const publicRpcClient = createPublicClient({
  transport: http(rpcUrl),
  chain,
});


const getApproval = async (sessionKeyAddress: Address) => {
  const userSigner = privateKeyToAccount(userPrivateKey);
  const ecdsaValidator = await signerToEcdsaValidator(publicRpcClient, {
    entryPoint,
    kernelVersion,
    signer: userSigner,
  });

  const servicePublicAccount = addressToEmptyAccount(sessionKeyAddress);
  const futureSignerAccount = await toECDSASigner({ signer: servicePublicAccount });

  /** This example also not working */
  // const callPolicy = toCallPolicy({
  //   policyVersion: CallPolicyVersion.V0_0_4,
  //   permissions: [
  //     {
  //       target: '',
  //       // valueLimit: parseEther("0.1"),
  //       // abi: [],
  //       // args: [{
  //       //   condition: ParamCondition.EQUAL,
  //       //   value: 1,
  //       // }],
  //     },
  //   ],
  // });

  const permissionPlugin = await toPermissionValidator(publicRpcClient, {
    kernelVersion,
    entryPoint,
    signer: futureSignerAccount,
    policies: [toSudoPolicy({})],
  });

  const sessionKeyAccount = await createKernelAccount(publicRpcClient, {
    entryPoint,
    kernelVersion,
    plugins: {
      sudo: ecdsaValidator,
      regular: permissionPlugin,
    },
  });

  console.log(`User public address: ${sessionKeyAccount.address}`);
  return await serializePermissionAccount(sessionKeyAccount);
}

/**
 * This functions is not working
 */
const sendWithPermission = async () => {
  const approvalSignature = await getApproval(serviceAccount.address);

  const serviceKeySigner = await toECDSASigner({
    signer: serviceAccount,
  });

  const sessionKeyAccount = await deserializePermissionAccount(
    publicRpcClient,
    entryPoint,
    kernelVersion,
    approvalSignature,
    serviceKeySigner,
  );

  const kernelClient = createKernelAccountClient({
    account: sessionKeyAccount,
    chain,
    bundlerTransport: http(bundlerUrl),
    client: publicRpcClient,
  });

  const userOpHash = await kernelClient.sendUserOperation({
    callData: await kernelClient.account.encodeCalls([
      {
        to: zeroAddress,
        value: BigInt(0),
        data: "0x",
      },
    ]),
  });

  const { receipt } = await kernelClient.waitForUserOperationReceipt({
    hash: userOpHash,
  });
  console.log(`UserOp: ${userOpHash}, transaction hash: ${receipt.transactionHash}, status: ${receipt.status}`);
};

/**
 * This function is working
 */
const sendDirect = async () => {
  const signer = privateKeyToAccount(userPrivateKey as Hex);
  const ecdsaValidator = await signerToEcdsaValidator(publicRpcClient, {
    signer,
    entryPoint,
    kernelVersion,
  });

  const sessionKeyAccount = await createKernelAccount(publicRpcClient, {
    plugins: {
      sudo: ecdsaValidator,
    },
    entryPoint,
    kernelVersion,
  });

  const kernelClient = createKernelAccountClient({
    account: sessionKeyAccount,
    chain,
    bundlerTransport: http(bundlerUrl),
    client: publicRpcClient,
  });

  const userOpHash = await kernelClient.sendUserOperation({
    callData: await kernelClient.account.encodeCalls([
      {
        to: zeroAddress,
        value: BigInt(0),
        data: "0x",
      },
    ]),
  });

  const { receipt } = await kernelClient.waitForUserOperationReceipt({
    hash: userOpHash,
  });
  console.log(`UserOp: ${userOpHash}, transaction hash: ${receipt.transactionHash}, status: ${receipt.status}`);
};

/** Broken run */
void sendWithPermission().then(() => process.exit(0));
/** Working run */
// void sendDirect().then(() => process.exit(0));
