# 🗻Fuji Finance

> Borrowing Rates Aggregator (built on MarketMake hackathon)

### **Description**

In traditional financial markets, there are always opportunities to refinance debt and lower the borrowing interest rate of a loan. Think of how often people aggregate their multiple debts, for example, home mortgages, student loans, multiple credit cards all into one loan with a lower rate.

At Fuji we believe that DeFi requires similar refinancing opportunities, but renovated to the 2.0 level with the power of blockchain and smartcontract automation.

Fuji Borrow is a protocol that pools user funds together and continuously scouts multiple lending protocols  to provide its users with the lowest interest rate available.

Borrowing rate aggregators such as Fuji Borrow are needed as an essential block of DeFi. In the long term such applications will serve to the whole DeFi ecosystem by bringing equilibrium to the borrowing markets in DeFi.

### **How It's Made**

The first step toward the aggregation of borrowing rates is to understand the "language" of each of the lending platforms. For a MVP we have chosen to study and learn the two major lending protocols, Aave and Compound. To facilitate the proof of concept we have also narrowed the project to a single product, ETH-collateral DAI- borrowing asset.

The product architecture includes 5 main elements:
• A Vault contract which handles user interaction and controls the assets.
<br/>
• An Interface Provider base contract which defines standards for interaction for every lending protocol from which then each provider derives its own proxy contract. We inspired on InstaDapp methods for this interfaces.
<br/>
• A Controller Contract which checks rates in the lending protocol and calls the Flasher  when an opportunity exists.
<br/>
• A Flasher contract that executes flashloans and call logic from the Vault to swap collateral and borrowing positions from a lending protocol to another. We use Aaves Flashloans to perform flasher operations.
<br/>
• A debt token contract that tracks the individual user debt positions and is linked to the vault operations. Based on Aaves debt contract standard.
<br/>

The initial step is to "standardize" the interface with each of the lending protocols. Lending protocols have 4 main core functions: deposit, withdraw, borrow, and repay. The standardization of the interface makes these core functions accessible in the "Fuji" environment.

The Controller Contract has a routine to check and compare borrowing rates across the borrowing markets of lending platforms. If conditions are met, the controller triggers a flashloan to repay debt in current platform, transfers the collateral, and finally opens the debt position in the new platform.

A non-transferable token, in similarity to Aave debt token, is used to simplify tracking of users' debt position balance.

Interaction of all these elements make FujiBorrow a viable protocol for Aggregating Borrowing Rates.

### **Schemes**

<img src="./images/Scheme1.png" >
<img src="./images/Scheme2.png" >

### **Vision**

Borrowing rate aggregators such as Fuji Borrow are needed as an essential block of DeFi.
In the long term such applications will serve to the whole DeFi ecosystem by bringing equilibrium to the borrowing markets in DeFi.

Fuji team aims to build more services on top of Fuji Borrow, you can connect with us on Twitter **[here](https://twitter.com/FujiFinance)**

Thanks to all MarketMake sponsors and helpers.

### **Team**

**[Boyan Barakov](https://twitter.com/BoyanBarakov)**

**[Daigaro Cota](https://twitter.com/DaigaroC)**

**[Edgar Moreau](https://twitter.com/TheEdgarMoreau)**

---

Scaffold-eth was used to bootstrap this project.

> QuickStart

`cd fuji`

`yarn install`

`yarn start`

> in a second terminal window:

`cd fuji`

`yarn fork`

> in a third terminal window:

`cd fuji`

`yarn deploy`
