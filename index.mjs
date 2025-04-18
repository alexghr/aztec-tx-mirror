import { createAztecNodeClient } from "@aztec/stdlib/interfaces/client";
import { TxHash } from "@aztec/stdlib/tx";

const nodeUrls = process.env.AZTEC_NODE_URLS?.split(",") ?? [];
const targetNodeUrl = process.env.AZTEC_TARGET_NODE_URL;
const targetTxHashes = process.argv
  .slice(2)
  .map((hash) => TxHash.fromString(hash));

if (!nodeUrls.length === 0) {
  console.error("AZTEC_NODE_URLS must be set");
  process.exit(1);
}

if (!targetNodeUrl) {
  console.error("AZTEC_TARGET_NODE_URL must be set");
  process.exit(1);
}

if (targetTxHashes.length === 0) {
  console.error("Must pass target tx hashes");
  process.exit(1);
}

const targetClient = createAztecNodeClient(targetNodeUrl);
for (const nodeUrl of nodeUrls) {
  if (targetTxHashes.length === 0) {
    break;
  }
  const client = createAztecNodeClient(nodeUrl);
  try {
    const txs = await client.getTxsByHash(targetTxHashes);
    console.log(
      `Pulled ${txs.length}/${targetTxHashes.length} from ${nodeUrl}`,
    );
    for (const tx of txs) {
      const txHash = await tx.getTxHash();
      try {
        await targetClient.sendTx(tx);
        console.log(`${txHash} pushed to node`);
        targetTxHashes.splice(
          targetTxHashes.findIndex((t) => t.equals(txHash)),
          1,
        );
      } catch (err) {
        console.error(`Error sending tx ${txHash} to ${targetNodeUrl}`, err);
      }
    }
  } catch (err) {
    console.error("Error mirroring txs", err);
  }
}

if (targetTxHashes.length > 0) {
  console.error(`Could not find txs: ${targetTxHashes.join(" ")}`);
  process.exit(1);
} else {
  console.log(`Pushed all txs`);
  process.exit(0);
}
