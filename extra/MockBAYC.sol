// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockBAYC is ERC721 {
    constructor() ERC721("MockBoredApeYachtClub", "MBAYC") {}

    function safeMint(address to) public {
        uint256 tokenId = uint256(
            keccak256(abi.encodePacked(to, block.timestamp))
        );
        _safeMint(to, tokenId);
    }
}
