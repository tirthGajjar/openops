export const getTenantIdFromToken = (accessToken: string) => {
  try {
    const [, payloadBase64] = accessToken.split('.');
    const payload = JSON.parse(atob(payloadBase64));

    return payload.tid || null;
  } catch (error) {
    throw new Error('Could not parse access token');
  }
};
