# textstreamjs

## Installation

```
yarn add textstreamjs
npm i textstreamjs
```

## Usage

```ts
import CodeStream from 'textstreamjs';
const cs = new CodeStream();
cs.write('export function sum(a,b) {\n`, () => {
    cs.write(`return a + b;\n`);
},'}\n');
```
