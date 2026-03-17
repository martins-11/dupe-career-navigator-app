import Document, { Head, Html, Main, NextScript } from 'next/document';

/**
 * Minimal custom Document to satisfy Next.js' expectation that `/_document` exists in some
 * build configurations / plugin combinations.
 *
 * This project primarily uses the App Router (`src/app/**`), but Next.js may still attempt
 * to resolve `/_document` during build-time component loading. Providing this file prevents
 * `PageNotFoundError: Cannot find module for page: /_document`.
 */
export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
