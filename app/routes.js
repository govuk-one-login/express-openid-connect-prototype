/**
 * This uses https://github.com/auth0/express-openid-connect
 *
 * It uses the `private_key_jwt` token endpoint authentication method
 * and expects responses to be signed with ECDSA using P-256 and SHA-256
 *
 * Required environment variables:
 *
 * ISSUER_BASE_URL=https://oidc.integration.account.gov.uk (or similar)
 * CREDENTIAL_ISSUER_URL=https://identity.integration.account.gov.uk (ditto)
 * BASE_URL=https://YOUR_PROTOTYPE_ROOT_URL
 * CLIENT_ID=YOUR_CLIENT_ID
 * SECRET=LONG_RANDOM_VALUE (for example `openssl rand -base64 32`)
 * RSA_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
 *    ...
 * -----END RSA PRIVATE KEY-----"
 *
 * Optional environment variables:
 *
 * REQUEST_IDENTITY_PROOFING=true
 *
 * which makes the following required:
 *
 * SPOT_PUBLIC_KEY=PUBLIC_KEY_FROM_IDENTITY_PROOFING
 *
 */
const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

const { auth, requiresAuth } = require('express-openid-connect')
const jwt = require('jsonwebtoken')

const authconfig = {
  authorizationParams: {
    response_type: 'code',
    scope: 'openid email phone',
  },
  authRequired: false, // Specify `requiresAuth()` on protected routes instead
  clientAssertionSigningKey: process.env.RSA_PRIVATE_KEY,
  idpLogout: true,
  idTokenSigningAlg: 'ES256',
  routes: {
    login: false, // so we can override `returnTo`
  }
}

if (process.env.REQUEST_IDENTITY_PROOFING == "true") {

  const claims = {
    userinfo: {
      "https://vocab.account.gov.uk/v1/coreIdentityJWT": {
          essential: true
      }
    }
  }

  const vtr = ["P2.Cl.Cm"]

  authconfig.authorizationParams.vtr = JSON.stringify(vtr)
  authconfig.authorizationParams.claims = JSON.stringify(claims)
}

router.use(auth(authconfig))

router.get('/login', (req, res) => res.oidc.login({ returnTo: '/profile' }))

router.get('/profile', requiresAuth(), async (req, res, next) => {

  const userinfo = await req.oidc.fetchUserInfo()
  const core_id_jwt = userinfo["https://vocab.account.gov.uk/v1/coreIdentityJWT"]

  if (core_id_jwt) {

    const pubkey = process.env.SPOT_PUBLIC_KEY
    const verification_options = {
      algorithms: ["ES256"],
      issuer: process.env.CREDENTIAL_ISSUER_URL,
      subject: userinfo.sub
    }

    jwt.verify(core_id_jwt, pubkey, verification_options, (err, decoded) => {
      if (err) {
        next(`Could not validate coreIdentityJWT: ${err}`)
      }
      userinfo.core_identity = decoded // so the "profile" template can parse it
    })
  } // else core_id_jwt not present. This shouldn't be an error condition
    // because if we requested it, we would get it. If the user fails to
    // prove their identity, they would be stopped with an error before
    // being returned to the Relying Party.

  res.locals.user = userinfo
  res.render('profile')
})
