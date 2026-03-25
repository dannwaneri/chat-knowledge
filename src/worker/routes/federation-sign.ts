// src/worker/routes/federation-sign.ts

export async function signAndSend(
    privateKeyPem: string,
    keyId: string,
    inboxUrl: string,
    activity: object
  ): Promise<{ ok: boolean; status: number }> {
  
    const body = JSON.stringify(activity);
    const url = new URL(inboxUrl);
  
    const date = new Date().toUTCString();
    const digest = await buildDigest(body);
  
    const signingString = [
      `(request-target): post ${url.pathname}`,
      `host: ${url.host}`,
      `date: ${date}`,
      `digest: SHA-256=${digest}`,
    ].join('\n');
  
    const signature = await sign(privateKeyPem, signingString);
  
    const signatureHeader = [
      `keyId="${keyId}"`,
      `algorithm="rsa-sha256"`,
      `headers="(request-target) host date digest"`,
      `signature="${signature}"`,
    ].join(',');
  
    const response = await fetch(inboxUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/activity+json',
        'Accept': 'application/activity+json',
        'Date': date,
        'Digest': `SHA-256=${digest}`,
        'Signature': signatureHeader,
        'Host': url.host,
      },
      body,
    });
  
    if (!response.ok) {
      console.error(`[federation] Failed to deliver to ${inboxUrl}: ${response.status}`, await response.text());
    } else {
      console.log(`[federation] Delivered to ${inboxUrl}: ${response.status}`);
    }
  
    return { ok: response.ok, status: response.status };
  }
  
  async function buildDigest(body: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(body);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  }
  
  async function sign(privateKeyPem: string, signingString: string): Promise<string> {
    // Import PEM private key
    const pemContents = privateKeyPem
      .replace(/-----BEGIN.*?-----/g, '')
      .replace(/-----END.*?-----/g, '')
      .replace(/\\n/g, '')      // literal \n escape sequences
      .replace(/\n/g, '')       // actual newlines
      .replace(/\r/g, '')       // carriage returns
      .replace(/\s/g, '')       // any remaining whitespace
      .trim();
  
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryDer.buffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );
  
    const encoder = new TextEncoder();
    const data = encoder.encode(signingString);
    const signatureBuffer = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, data);
  
    return btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
  }