# Testing

## Testing Libraries
* **Jest** – framework used for unit testing
* **React Testing Library** – to render React components
* **Next.js Mock** – to mock button push

## Approach

### Unit Test
Tests that clicking on the ShelfShare logo in the Navbar correctly reroutes the user to the home page.

### Setup
Install necessary dependencies

```sh
npm install --save @testing-library/react jest jest-mock next
```
Installs jest and React Testing Library.

```sh
import { render, fireEvent, screen } from '@testing-library/react';
import Navbar from '../Navbar';
import { useRouter } from 'next/router';
```
The test file imports the required libraries and components.
* **@testing-library/react** provides what is necessary to render/interact with components
  * fireEvent – simulates clicks
  * screen – queries elements
* **useRouter** – handles navigation

## Steps
* A mock router is created with a push function to simulate a user's navigation to the logo
* Image is queried by its alt text ('ShelfShare Logo')
   * The closest anchor (<a> element) wrapping the image is found
* Navbar is rendered
* Click is simulated
* Ensures that mockRouter.push was called with '/home', confirming that clicking the logo triggers navigation

### Run test
```sh
npm test
```
Button functionality works. A click on the logo reroutes to the home page.
