import { gql } from '@apollo/client/core';
import { apolloClient } from '../apollo-client';
import { login } from '../authentication/login';
import { getAddressFromSigner } from '../ethers.service';
import { follow } from '../follow/follow';
import { prettyJSON, sleep } from '../helpers';

const HAS_TX_BEEN_INDEXED = `
  query($request: HasTxHashBeenIndexedRequest!) {
    hasTxHashBeenIndexed(request: $request) { 
	    ... on TransactionIndexedResult {
            indexed
            txReceipt {
                to
                from
                contractAddress
                transactionIndex
                root
                gasUsed
                logsBloom
                blockHash
                transactionHash
                blockNumber
                confirmations
                cumulativeGasUsed
                effectiveGasPrice
                byzantium
                type
                status
                logs {
                    blockNumber
                    blockHash
                    transactionIndex
                    removed
                    address
                    data
                    topics
                    transactionHash
                    logIndex
                }
            }
        }
        ... on TransactionError {
            reason
            txReceipt {
                to
                from
                contractAddress
                transactionIndex
                root
                gasUsed
                logsBloom
                blockHash
                transactionHash
                blockNumber
                confirmations
                cumulativeGasUsed
                effectiveGasPrice
                byzantium
                type
                status
                logs {
                    blockNumber
                    blockHash
                    transactionIndex
                    removed
                    address
                    data
                    topics
                    transactionHash
                    logIndex
             }
            }
        },
        __typename
    }
  }
`;

export const hasTxBeenIndexed = (txHash: string) => {
  return apolloClient.query({
    query: gql(HAS_TX_BEEN_INDEXED),
    variables: {
      request: {
        txHash,
      },
    },
    fetchPolicy: 'network-only',
  });
};

export const pollUntilIndexed = async (txHash: string) => {
  while (true) {
    const result = await hasTxBeenIndexed(txHash);
    console.log('pool until indexed: result', result.data);

    const response = result.data.hasTxHashBeenIndexed;
    if (response.__typename === 'TransactionIndexedResult') {
      console.log('pool until indexed: indexed', response.indexed);
      if (response.indexed) {
        return true;
      }

      console.log(
        'pool until indexed: sleep for 500 milliseconds then try again'
      );
      // sleep for a second before trying again
      await sleep(500);
    } else {
      // it got reverted and failed!
      throw new Error(response.reason);
    }
  }
};

export const testTransaction = async () => {
  const address = getAddressFromSigner();
  console.log('testTransaction: address', address);

  await login(address);

  const hash = await follow('0x06');
  prettyJSON('testTransaction: hash', hash);

  await pollUntilIndexed(hash);

  console.log('testTransaction: Indexed');
};

(async () => {
  await testTransaction();
})();