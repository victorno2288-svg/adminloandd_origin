// SlipVerifyBadge.jsx — re-exports จาก SlipVerifier.jsx
export { default, SlipVerifier } from './SlipVerifier'
export function useSlipVerify() { return { runVerify: () => {}, verifyResult: null, verifying: false } }
