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
