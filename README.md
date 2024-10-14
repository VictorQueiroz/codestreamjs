# @textstream/core

## Installation

### Yarn

```bash
yarn add @textstream/core
```

### NPM

```bash
npm i @textstream/core
```

## Usage

```ts
import TextStream from '@textstream/core';
// Or: import {TextStream} from '@textstream/core';
const cs = new TextStream();
cs.write('export function sum(a,b) {\n`, () => {
    cs.write(`return a + b;\n`);
},'}\n');
```
