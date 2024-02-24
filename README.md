# GOV.UK Prototype Kit + Auth0 express-openid-connect + GOV.UK One Login

This Node.js proof-of-concept integrates the [GOV.UK Prototype Kit](https://prototype-kit.service.gov.uk/)
with [GOV.UK One Login](https://www.sign-in.service.gov.uk/) using Auth0's
[express-openid-connect](https://github.com/auth0/express-openid-connect) `npm` module.

The user experience is hardly Alton Towers: you log in, you get your profile. But see [/app/routes.js](app/routes.js)
to see how little configuration is required to get your Express prototype integrated as a Relying Party.

> [!TIP]
> If you have an email address in the `gov.uk` domain or [other selected domains](https://raw.githubusercontent.com/govuk-one-login/onboarding-self-service-experience/main/express/resources/allowed-email-domains.txt) you can register your copy of this prototype as a Relying Party for 'authentication only' using the [GOV.UK One Login admin tool](https://admin.sign-in.service.gov.uk/register).

## Environment variables

The Prototype uses the [dotenv](https://www.npmjs.com/package/dotenv) npm package to load configuration variables from a `.env` file. Read the [`.env` example](example.env.txt) to see what the file should look like. The Client ID and keys will need to be replaced for your application.

### Required environment variables

The following environment variables must be defined:

    ISSUER_BASE_URL

In testing, this will be https://oidc.integration.account.gov.uk

    BASE_URL

The base URL of wherever you are hosting this prototype.  It should have been registered as a Relying Party with GOV.UK One Login. In testing locally this will be http://localhost:3000

    CLIENT_ID

The Client ID of your Relying Party, which you should have received when you registered with GOV.UK One Login.

    SECRET

A long, random string used to encrypt the session cookie.  You can generate one with `openssl rand -base64 32`

    RSA_PRIVATE_KEY

The private key of the keypair you generated when registering your Relying Party with GOV.UK One Login.  You can generate an RSA keypair as follows:

    openssl genrsa -out private.pem 2048
    openssl rsa -in private.pem -pubout

Only supply the public key when registering you client. The private key should remain just that.

### Optional environment variables

    REQUEST_IDENTITY_PROOFING

Set this to the string `"true"` if you want Identity Proofing and Verification.  If you do, the following are also required:

    CREDENTIAL_ISSUER_URL

Likely to be https://identity.integration.account.gov.uk


    CREDENTIAL_ISSUER_RSA_PUBLIC_KEY

The RSA Public Key of the Credential Issuer (i.e. the above host)

The technical documentation explains [how to aquire the RSA Public Key of the Credential Issuer](https://docs.sign-in.service.gov.uk/integrate-with-integration-environment/prove-users-identity/)

> [!NOTE]
> Identity Proofing and Verification is not currently available to services registered using the [self-service admin tool](https://admin.sign-in.service.gov.uk/). 
> 
> For help configuring your app for identity proving please contact the GOV.UK One Login onboarding team via:
> [`#govuk-one-login`](https://ukgovernmentdigital.slack.com/archives/C02AQUJ6WTC) channel on cross government Slack or [the support form](https://www.sign-in.service.gov.uk/contact-us), explain that you need help configuring a client using the `https://github.com/govuk-one-login/express-openid-connect-prototype` prototype in the 'how can we help' field.)

## Running locally

The GOV.UK One Login integration environment supports `localhost` as a Relying Party.  When registering your prototype, ensure you set the Redirect URI to `http://localhost:3000/callback`.  Then, to start your prototype:

    npm install
    npm run dev

and browse to http://localhost:3000

## Bonus: a quick round of code golf

This is a complete Relying Party that will spit out your profile in JSON:

```js
const express = require('express')
const app = express()
const { auth } = require('express-openid-connect')
const port = process.env.PORT || 3000
app.use(auth({
  authorizationParams: {
    response_type: 'code',
    scope: 'openid email phone',
  },
  clientAssertionSigningKey: process.env.RSA_PRIVATE_KEY,
  idTokenSigningAlg: 'ES256'
}))
app.get('/', async (req, res) => {
  userinfo = await req.oidc.fetchUserInfo()
  res.json(userinfo)
})
app.listen(port)
```
