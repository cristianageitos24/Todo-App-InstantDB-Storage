'use client';

export default function ConfigError() {
  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2 style={{ color: 'var(--accent-color)', marginBottom: '20px' }}>
          Configuration Required
        </h2>
        <p style={{ marginBottom: '20px', color: 'var(--text-color)' }}>
          The InstantDB App ID is not configured. Please set the environment variable in Vercel.
        </p>
        
        <div style={{ 
          background: 'var(--background)', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '2px solid var(--secondary-color)'
        }}>
          <h3 style={{ 
            color: 'var(--accent-color)', 
            marginBottom: '15px', 
            fontSize: '1.1rem' 
          }}>
            Setup Instructions:
          </h3>
          <ol style={{ 
            color: 'var(--text-color)', 
            paddingLeft: '20px',
            lineHeight: '1.8'
          }}>
            <li style={{ marginBottom: '10px' }}>
              Go to your Vercel project dashboard
            </li>
            <li style={{ marginBottom: '10px' }}>
              Navigate to <strong>Settings</strong> → <strong>Environment Variables</strong>
            </li>
            <li style={{ marginBottom: '10px' }}>
              Add a new environment variable:
              <div style={{ 
                marginTop: '8px', 
                padding: '10px', 
                background: 'var(--primary-color)', 
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '0.9rem'
              }}>
                <div>Name: <strong>NEXT_PUBLIC_INSTANTDB_APP_ID</strong></div>
                <div>Value: <strong>your_instantdb_app_id</strong></div>
              </div>
            </li>
            <li style={{ marginBottom: '10px' }}>
              Get your App ID from{' '}
              <a 
                href="https://instantdb.com/dash" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  color: 'var(--accent-color)', 
                  textDecoration: 'underline' 
                }}
              >
                instantdb.com/dash
              </a>
            </li>
            <li>
              Redeploy your application in Vercel
            </li>
          </ol>
        </div>

        <div style={{ 
          padding: '15px', 
          background: 'rgba(0, 255, 196, 0.1)', 
          borderRadius: '8px',
          border: '1px solid rgba(0, 255, 196, 0.3)'
        }}>
          <p style={{ 
            color: 'var(--accent-color)', 
            fontSize: '0.9rem', 
            margin: 0,
            textAlign: 'center'
          }}>
            After setting the environment variable and redeploying, refresh this page.
          </p>
        </div>
      </div>
    </div>
  );
}
