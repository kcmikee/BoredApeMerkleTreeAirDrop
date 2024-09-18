import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';

const { pack } = require("@ethersproject/solidity");
const { keccak256 } = require("@ethersproject/keccak256");
const { defaultAbiCoder } = require("@ethersproject/abi");

/**
 * @fileoverview
 * This script reads a CSV file containing user addresses and airdrop amounts, constructs a 
 * Merkle tree using this data, generates Merkle proofs for each address, and saves the 
 * Merkle root and proofs to JSON files for later use in a smart contract.
 */

// Define the path to your CSV file
const wlPath = path.resolve(__dirname, '../utils/wl.csv');

// Initialize arrays to store addresses, amounts, and the raw data used for Merkle tree leaves
const addresses: string[] = [];
const airDropAmount: string[] = [];
const rawData: Array<[string, number]> = [];  // Stores address and amount pairs

let root: string;  // Variable to store the Merkle root

/**
 * Reads and parses the CSV file to extract user addresses and airdrop amounts.
 * The data is then used to create a Merkle tree and generate proofs for each address.
 */
fs.createReadStream(wlPath)
  .pipe(csv())
  .on('data', (row: { [key: string]: string }) => {
    // Extract and store address and amount from each row
    addresses.push(row['user_address']);
    airDropAmount.push(row['amount']);
    rawData.push([row['user_address'], parseFloat(row['amount'])]);  // Convert amount to a number
  })
  .on('end', () => {
    try {
      // Create the Standard Merkle Tree from the extracted data
      const tree = StandardMerkleTree.of(rawData, ["address", "uint256"]);
      root = tree.root;

      // Log the Merkle root
      console.log('Merkle Root:', root);

      // Initialize an object to store the proofs
      const proofs: { [address: string]: string[] } = {};
      
      // Generate proofs for each address based on its index in the addresses array
      addresses.forEach((address, index) => {
        const amount = airDropAmount[index];
        
        // Generate the Merkle leaf for this address and amount
        const leaf = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [address, amount]));
        
        // Get the Merkle proof for this leaf
        const proof = tree.getProof(index);

        // Store the proof in the proofs object using the address as the key
        proofs[address.toLowerCase()] = proof;

        // Optionally, log the generated proof
        // console.log('Generated proof for:', address);
      });

      // Define the path to save the proofs JSON file
      const proofsFilePath = path.resolve(__dirname, '../utils/proofs.json');
      
      // Write the proofs object to the JSON file
      fs.writeFileSync(proofsFilePath, JSON.stringify(proofs, null, 2), 'utf-8');
      console.log('Proofs have been written to proofs.json');
      
    } catch (err) {
      // Log any errors that occur during the Merkle tree creation or proof generation
      console.error('Error processing the Merkle tree:', err);
    }
  })
  .on('error', (err: Error) => {
    // Log any errors that occur during the CSV file reading
    console.error(`Error reading the CSV file at ${wlPath}:`, err);
  });
