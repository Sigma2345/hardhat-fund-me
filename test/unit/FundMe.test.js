const { expect } = require('chai');
const { deployments, ethers, getNamedAccounts } = require('hardhat');
describe('FundMe', function() {
    let fundMe;
    let deployer;
    let MockV3Aggregator;
    let sendValue = ethers.utils.parseEther("10");
    //let provider = new ethers.providers.JsonRpcProvider();
    beforeEach(async function() {
        deployer = (await getNamedAccounts()).deployer;
        // user = (await getNamedAccounts()).user;
        await deployments.fixture(["all"]);
        fundMe = await ethers.getContract("FundMe", deployer);
        MockV3Aggregator = await ethers.getContract(
            "MockV3Aggregator",
            deployer);
    })

    //for constructor
    describe("Constructor", async function() {
        it("sets the aggregator address correctly",
            async function() {
                const response = await fundMe.getPriceFeed();
                // console.log("Response Address is ", response);
                // console.log(`Mock Aggregator address is ${MockV3Aggregator.address}`);
                expect(response).to.equal(MockV3Aggregator.address);
            })
    })

    describe("receive", async function() {
        it("sends the contract 10 eth", async function() {
            const accounts = await ethers.getSigners();
            const tx = await accounts[2].sendTransaction({
                to: fundMe.address,
                value: sendValue
            })
            const fundedAmount = await fundMe.getaddressToAmountFunded(accounts[2].address);

            // console.log(accounts[2]);
            expect(fundedAmount.toString()).to.equal(sendValue);
        })
    })

    describe("fund", async function() {
        it("reverts back if funds donated less than minETH",
            async function() {
                await expect(fundMe.fund())
                    .to.be
                    .revertedWith("You need to spend more ETH!");
            })
        it("updates the amount funded data structure",
            async function() {
                await fundMe.fund({
                    value: sendValue
                });
                const fundedAmount = await fundMe.getaddressToAmountFunded(deployer);
                expect(fundedAmount.toString()).to.equal(sendValue);
            })
        it("adds funder to array of funders",
            async function() {
                await fundMe.fund({
                    value: sendValue
                });
                const firstFunder = await fundMe.getFunder(0);
                expect(firstFunder).to.equal(deployer);
            })
    })
    describe("withdraw", async function() {
        beforeEach(async function() {
            await fundMe.fund({ value: sendValue });
        })
        it("allows only one address to withdraw", async function() {
            const startingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            );
            const startingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            );

            const txResponse = await fundMe.withdraw();
            const txReceipt = await txResponse.wait(1);
            // console.log(txReceipt);
            const endingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            );
            const endingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            );

            const TotalGasPrice = (txReceipt.gasUsed)
                .mul(txReceipt.effectiveGasPrice);
            expect(endingFundMeBalance.toString()).to.equal("0");
            expect((startingDeployerBalance.add(startingFundMeBalance)).toString())
                .to.equal((endingDeployerBalance.add(TotalGasPrice)).toString());
        })

        it("allows only one address to withdraw from multiple funders",
            async function() {
                const accounts = await ethers.getSigners();
                for (let i = 1; i < 6; i++) {
                    const fundMeConnectedContract = await fundMe
                        .connect(accounts[i]);
                    await fundMeConnectedContract.fund({ value: sendValue });
                }
                const startingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address
                );
                const startingDeployerBalance = await fundMe.provider.getBalance(
                    deployer
                );

                const txResponse = await fundMe.withdraw();
                const txReceipt = await txResponse.wait(1);

                const endingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address
                );
                const endingDeployerBalance = await fundMe.provider.getBalance(
                    deployer
                );
                const TotalGasPrice = (txReceipt.gasUsed)
                    .mul(txReceipt.effectiveGasPrice);
                expect(endingFundMeBalance.toString()).to.equal("0");
                expect((startingDeployerBalance.add(startingFundMeBalance)).toString())
                    .to.equal((endingDeployerBalance.add(TotalGasPrice)).toString());


                //check funders array empty
                await expect(fundMe.getFunder(0)).to.be.reverted;
                //check if mapping is empty or not
                for (let i = 1; i < 6; i++) {
                    const amount = await fundMe.getaddressToAmountFunded(accounts[i].address);
                    expect(amount.toString())
                        .to.equal("0");
                }
            })
        it("allows only owner to extract Funds", async function() {
            const accounts = await ethers.getSigners();
            const attacker = accounts[1];
            const attackerConnectedContract = await fundMe.connect(attacker);
            await expect(attackerConnectedContract.withdraw())
                .to.be.revertedWith("FundMe__NotOwner")

        })

        it(" cheaper withdaraw allows only one address to withdraw", async function() {
            const startingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            );
            const startingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            );

            const txResponse = await fundMe.cheaperWithdraw();
            const txReceipt = await txResponse.wait(1);
            // console.log(txReceipt);
            const endingFundMeBalance = await fundMe.provider.getBalance(
                fundMe.address
            );
            const endingDeployerBalance = await fundMe.provider.getBalance(
                deployer
            );

            const TotalGasPrice = (txReceipt.gasUsed)
                .mul(txReceipt.effectiveGasPrice);
            expect(endingFundMeBalance.toString()).to.equal("0");
            expect((startingDeployerBalance.add(startingFundMeBalance)).toString())
                .to.equal((endingDeployerBalance.add(TotalGasPrice)).toString());
        })

        it("CheaperWithdraw Testing ......",
            async function() {
                const accounts = await ethers.getSigners();
                for (let i = 1; i < 6; i++) {
                    const fundMeConnectedContract = await fundMe
                        .connect(accounts[i]);
                    await fundMeConnectedContract.fund({ value: sendValue });
                }
                const startingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address
                );
                const startingDeployerBalance = await fundMe.provider.getBalance(
                    deployer
                );

                const txResponse = await fundMe.cheaperWithdraw();
                const txReceipt = await txResponse.wait(1);

                const endingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address
                );
                const endingDeployerBalance = await fundMe.provider.getBalance(
                    deployer
                );
                const TotalGasPrice = (txReceipt.gasUsed)
                    .mul(txReceipt.effectiveGasPrice);
                expect(endingFundMeBalance.toString()).to.equal("0");
                expect((startingDeployerBalance.add(startingFundMeBalance)).toString())
                    .to.equal((endingDeployerBalance.add(TotalGasPrice)).toString());


                //check funders array empty
                await expect(fundMe.getFunder(0)).to.be.reverted;
                //check if mapping is empty or not
                for (let i = 1; i < 6; i++) {
                    const amount = await fundMe.getaddressToAmountFunded(accounts[i].address);
                    expect(amount.toString())
                        .to.equal("0");
                }
            })
    })
});