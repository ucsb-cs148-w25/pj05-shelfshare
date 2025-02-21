# Testing

## Testing Libraries
* **Jest** – framework used for unit testing
* **React Testing Library** – to render React components
* **Next.js Mock** – to mock Next.js specific modules

## Approach

### Unit Test
Tests that clicking on the ShelfShare logo in the Navbar correctly reroutes the user to the home page.

### Setup
Install necessary dependencies

```sh
npm install --save-dev @types/jest ts-jest @testing-library/jest-dom @testing-library/react
```
Installs Jest and React Testing Library.

```sh
import { render, fireEvent } from "@testing-library/react";
import Navbar from "../Navbar";
import { useRouter, usePathname } from "next/navigation";
```
The test file imports the required libraries and components.
* **@testing-library/react** provides what is necessary to render/interact with components
  * fireEvent – simulates clicks
* **useRouter** – handles navigation
* Navbar component is imported for testing

## Steps
* Mock router is created with a push function to simulate navigation
* Current pathname is set using usePathname
* Navbar component is rendered
* Logo is queried using its alt text ("ShelfShare Logo")
* Closest element wrapping the logo is found
* Simulated a user's click

```sh
cd hello-world
```
Test file is located in the tests folder within the components folder of the app folder.

### Run test
```sh
npm test
```
Button functionality works. A click on the logo reroutes to the home page.

## Component Testing (2/21)
For the component testing aspect of Lab 06, we test our whole navigation bar, ensuring that the buttons go to the appropriate page. Before running, install the following dependencies:
```sh
npm install --save-dev @types/jest
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event
```
Then run test.
```sh
npm test
```

### Plans For Unit Testing Going Forward
* For unit testing going forward, we plan to test the functionality of all the buttons necessary in the process of searching for a book, viewing the current reviews, favoriting the book, adding it to a specific shelf, and leaving a review, as that is the core action of our website. This would include all the buttons in that process, which would test that the backend functionality for adding a book to a shelf is successful.

### Plans For Higher Level Testing Going Forward
* For higher level testing going forward, since it is not feasible to test at a high-level (since our site is a social media site), we will be focusing on unit testing for the functionality of smaller components.

