const StarNotary = artifacts.require("StarNotary");

var accounts;
var owner;
var starId = 0;

contract('StarNotary', (accs) => {
    accounts = accs;
    owner = accounts[0];
});

it('can Create a Star', async() => {
    starId++;
    let instance = await StarNotary.deployed();
    await instance.createStar('Awesome Star!', starId, {from: accounts[0]})
    assert.equal(await instance.tokenIdToStarInfo.call(starId), 'Awesome Star!')
});

it('lets user1 put up their star for sale', async() => {
    let instance = await StarNotary.deployed();
    let user1 = accounts[1];
    starId++;
    let starPrice = web3.utils.toWei(".01", "ether");
    await instance.createStar('awesome star', starId, {from: user1});
    await instance.putStarUpForSale(starId, starPrice, {from: user1});
    assert.equal(await instance.starsForSale.call(starId), starPrice);
});

it('lets user1 get the funds after the sale', async() => {
    let instance = await StarNotary.deployed();
    let user1 = accounts[1];
    let user2 = accounts[2];
    starId++;
    let starPrice = web3.utils.toWei(".01", "ether");
    let balance = web3.utils.toWei(".05", "ether");
    await instance.createStar('awesome star', starId, {from: user1});
    await instance.putStarUpForSale(starId, starPrice, {from: user1});

    /** TODO add test for not approve buyer.
     * */
    await instance.approve(user2, starId, {from: user1});
    let buyerApproved = await instance.getApproved(starId);
    assert.equal(buyerApproved, user2);
    await instance.setApprovalForAll(user2, true, {from: user1});
    let isApprovedForAll = await instance.isApprovedForAll(user1, user2);
    assert.isTrue(isApprovedForAll, 'no approved for all');

    let balanceOfUser1BeforeTransaction = await web3.eth.getBalance(user1);
    await instance.buyStar(starId, {from: user2, value: balance});
    let balanceOfUser1AfterTransaction = await web3.eth.getBalance(user1);
    let value1 = Number(balanceOfUser1BeforeTransaction) + Number(starPrice);
    let value2 = Number(balanceOfUser1AfterTransaction);

    assert.equal(value1, value2);
});

it('lets user2 buy a star, if it is put up for sale', async() => {
    let instance = await StarNotary.deployed();
    let user1 = accounts[1];
    let user2 = accounts[2];
    starId++;
    let starPrice = web3.utils.toWei(".01", "ether");
    let balance = web3.utils.toWei(".05", "ether");
    await instance.createStar('awesome star', starId, {from: user1});
    await instance.putStarUpForSale(starId, starPrice, {from: user1});
    let balanceOfUser1BeforeTransaction = await web3.eth.getBalance(user2);
    await instance.buyStar(starId, {from: user2, value: balance});
    assert.equal(await instance.ownerOf.call(starId), user2);
});

it('lets user2 buy a star and decreases its balance in ether', async() => {
    let instance = await StarNotary.deployed();
    let user1 = accounts[1];
    let user2 = accounts[2];
    starId++;
    let starPrice = web3.utils.toWei(".01", "ether");
    let balance = web3.utils.toWei(".05", "ether");
    await instance.createStar('awesome star', starId, {from: user1});
    await instance.putStarUpForSale(starId, starPrice, {from: user1});
    let balanceOfUser1BeforeTransaction = await web3.eth.getBalance(user2);
    const balanceOfUser2BeforeTransaction = await web3.eth.getBalance(user2);
    await instance.buyStar(starId, {from: user2, value: balance, gasPrice:0});
    const balanceAfterUser2BuysStar = await web3.eth.getBalance(user2);
    let value = Number(balanceOfUser2BeforeTransaction) - Number(balanceAfterUser2BuysStar);
    assert.equal(value, starPrice);
});

// Implement Task 2 Add supporting unit tests

it('can add the star name and star symbol properly', async() => {
    // 1. create a Star with different tokenId
    starId++;
    let instance = await StarNotary.deployed();
    await instance.createStar('Awesome Star!', starId, {from: accounts[0]})
    assert.equal(await instance.tokenIdToStarInfo.call(starId), 'Awesome Star!')

    //2. Call the name and symbol properties in your Smart Contract and compare with the name and symbol provided
    let name = await instance.name();
    let symbol = await instance.symbol();

    //Assert values accordingly to the ones set in the deploy contracts script.
    assert.equal(name, 'StarNotary', 'Token name is not the expected');
    assert.equal(symbol, 'STAR', 'Token symbol is not the expected');
});

it('lets 2 users exchange stars', async() => {
    // 1. create 2 Stars with different tokenId
    //Set the Star Identificators
    let star1 = ++starId;
    let star2 = ++starId;

    //Set the Star Names
    let starName1 = 'The First Foundation of Asimov';
    let starName2 = 'The second Foundation of Asimov';

    //Set the Star Owners
    let user1 = accounts[1];
    let user2 = accounts[2];

    //Proceed to create Stars
    let instance = await StarNotary.deployed();
    
    await instance.createStar(starName1, star1, {from: user1});
    assert.equal(await instance.tokenIdToStarInfo.call(star1), starName1);

    await instance.createStar(starName2, star2, {from: user2});
    assert.equal(await instance.tokenIdToStarInfo.call(star2), starName2);

    //Assert ownership of each recently created star
    assert(await instance.ownerOf(star1), user1, 'Star1 [' + starName1 + '] should belong to: ' + user1);
    assert(await instance.ownerOf(star2), user2, 'Star2 [' + starName2 + '] should belong to: ' + user2);
    
    // 2. Call the exchangeStars functions implemented in the Smart Contract
    try{

        //Appprove Users on Stars to exchange to each other.
        await instance.approve(user2, star1, {from: user1});
        assert.equal(await instance.getApproved(star1), user2, 'User1 has not authorized User 2 for echange on Star1');
        await instance.setApprovalForAll(user2, true, {from: user1});
        assert.isTrue(await instance.isApprovedForAll(user1, user2), 'User2 no approved for all on User1 stars');

        await instance.approve(user1, star2, {from: user2});
        assert.equal(await instance.getApproved(star2), user1, 'User1 has not authorized User 2 for echange on Star1');
        await instance.setApprovalForAll(user1, true, {from: user2});
        assert.isTrue(await instance.isApprovedForAll(user2, user1), 'User2 no approved for all on User1 stars');

        //Do the transfer once authorizations has been granted
        await instance.exchangeStars(star1, star2, {from: user1});
    } catch(error){        
        assert.isNotOk(error, 'Error should be FALSE: [' + error + ']');
    }

    // 3. Verify that the owners changed
    assert(await instance.ownerOf(star1), user2, 'Star1 [' + starName1 + '] NOW should belong to: ' + user2);
    assert(await instance.ownerOf(star2), user1, 'Star2 [' + starName2 + '] NOW should belong to: ' + user1);

});

it('lets a user transfer a star', async() => {
    let starName = 'Hapwkings Home';

    //Set the Star Owners
    let creator = accounts[1];
    let receiver = accounts[2];

    // 1. create a Star with different tokenId
    starId++;
    let instance = await StarNotary.deployed();
    await instance.createStar(starName, starId, {from: creator})
    assert.equal(await instance.tokenIdToStarInfo.call(starId), starName)

    //Assert ownership of the star
    assert.equal(await instance.ownerOf(starId), creator, 'Star [' + starName + '] should belong to: ' + creator);
    assert.notEqual(await instance.ownerOf(starId), receiver, 'Star [' + starName + '] should NOT belong to: ' + receiver);

    // 2. use the transferStar function implemented in the Smart Contract
    try {
        //Appprove receiver to get the Star.
        await instance.approve(receiver, starId, {from: creator});
        assert.equal(await instance.getApproved(starId), receiver, 'Receiver has not authorized to get Star: [' + starName + ']');
        await instance.setApprovalForAll(receiver, true, {from: creator});
        assert.isTrue(await instance.isApprovedForAll(creator, receiver), 'Receiver has not authorized to get ALL stars from Creator');

        await instance.transferStar(receiver, starId, {from : creator});
    } catch(error) {
        assert.isNotOk(error, 'Error should be FALSE: [' + error + ']');
    }

    // 3. Verify the star owner changed.
    //Assert ownership of the star
    assert.equal(await instance.ownerOf(starId), receiver, 'Star [' + starName + '] should belong to: ' + receiver);
    assert.notEqual(await instance.ownerOf(starId), creator, 'Star [' + starName + '] should NOT belong to: ' + creator);

});

it('lookUptokenIdToStarInfo test', async() => {
    // 1. create a Star with different tokenId
    let starName = 'Hitchhikers Guide';

    //Set the Star Owner
    let creator = accounts[1];

    starId++;
    let instance = await StarNotary.deployed();
    await instance.createStar(starName, starId, {from: creator})
    assert.equal(await instance.tokenIdToStarInfo.call(starId), starName)

    // 2. Call your method lookUptokenIdToStarInfo
    let star = await instance.lookUptokenIdToStarInfo(starId);

    // 3. Verify if you Star name is the same
    assert.equal(star, starName);

});

it('lookUptokenIdStarInfo not existing star', async() =>{
    let instance = await StarNotary.deployed();

    // Does not matter at all the starId, just one you are sure has not been minted yet.
    let noExistingId = Number(1000);

    assert.equal(await instance.tokenIdToStarInfo.call(noExistingId), '');
    try{
        let starName = await instance.lookUptokenIdToStarInfo(noExistingId);
        assert.isFalse(starName || starName === null || starName === '', 'StarName must be empty, null or undefined');
    } catch(error){
        assert.isOk(error, 'Error for non existing token');
    }
    
});