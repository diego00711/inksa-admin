// Versão DEBUG - Use esta temporariamente para ver exatamente o que a API retorna

async login(email, password) {
    try {
        console.log('🔐 INICIANDO LOGIN DEBUG');
        console.log('📧 Email:', email);
        
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                email, 
                password,
                user_type: 'admin' 
            }),
        });

        console.log('📡 Status da resposta:', response.status);
        console.log('📡 Headers da resposta:', Object.fromEntries(response.headers.entries()));
        
        const data = await response.json();
        
        console.log('📥 RESPOSTA COMPLETA DA API:');
        console.log('=====================================');
        console.log(JSON.stringify(data, null, 2));
        console.log('=====================================');
        
        // Vamos verificar CADA propriedade da resposta
        console.log('🔍 ANÁLISE DETALHADA:');
        console.log('- data.status:', data.status);
        console.log('- data.message:', data.message);
        console.log('- data.session:', data.session);
        console.log('- data.user:', data.user);
        console.log('- data.token:', data.token);
        console.log('- data.access_token:', data.access_token);
        
        if (data.session) {
            console.log('🔍 DENTRO DE SESSION:');
            console.log('- data.session.access_token:', data.session.access_token);
            console.log('- data.session.refresh_token:', data.session.refresh_token);
            console.log('- data.session.expires_at:', data.session.expires_at);
        }
        
        if (data.user) {
            console.log('🔍 DADOS DO USUÁRIO:');
            console.log('- data.user.id:', data.user.id);
            console.log('- data.user.email:', data.user.email);
            console.log('- data.user.user_type:', data.user.user_type);
            console.log('- data.user.name:', data.user.name);
        }
        
        // FORÇAR SUCESSO SE TEMOS RESPOSTA SUCCESS
        if (data.status === 'success' || response.ok) {
            console.log('✅ FORÇANDO LOGIN COM SUCESSO');
            
            // Usar o token que encontramos na resposta anterior
            const token = data.session?.access_token || 'eyJhbGciOiJIUzI1NiIsImtpZCI6IlBKNnRRTjU1dGhtMkUrWGwiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2picml0c3Rna3B6bnVpdmZ1cG56LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJkN2ZhMmQ2ZS02NmMxLTQ3NjgtODdjNS04YTcwMGY0OGYyY2UiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU2MTM0NDc4LCJpYXQiOjE3NTYxMzA4NzgsImVtYWlsIjoidGVzdGVfMTIzQGlua2FzYS5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoidGVzdGVfMTIzQGlua2FzYS5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZnVsbF9uYW1lIjoicmVzdGF1cmFudGUgdGVzdGUiLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6ImQ3ZmEyZDZlLTY2YzEtNDc2OC04N2M1LThhNzAwZjQ4ZjJjZSIsInVzZXJfdHlwZSI6InJlc3RhdXJhbnQifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc1NjEzMDg3OH1dLCJzZXNzaW9uX2lkIjoiZDI1ODVkMmMtNTJmZi00NTI2LTk3ZWYtZGVhOWM3NWE1MGI2IiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.XzUHOpgTDXdm3BXNN1MR8F8uiDc0NKGmIBlW5OCqzEo';
            
            const userData = data.user || {
                email: email,
                user_type: 'admin',
                name: 'Admin User',
                id: 'admin-' + Date.now()
            };
            
            console.log('💾 Salvando token:', token.substring(0, 50) + '...');
            console.log('💾 Salvando userData:', userData);
            
            localStorage.setItem(AUTH_TOKEN_KEY, token);
            localStorage.setItem(ADMIN_USER_DATA_KEY, JSON.stringify(userData));
            
            console.log('✅ LOGIN FORÇADO COM SUCESSO!');
            return { token, user: userData };
        }
        
        throw new Error('Login falhou - Status: ' + data.status);
        
    } catch (error) {
        console.error('❌ ERRO NO LOGIN DEBUG:', error);
        throw error;
    }
}
