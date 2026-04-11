
const net = require('net');

const targets = [
    { host: 'aws-0-ap-northeast-1.pooler.supabase.com', port: 5432 },
    { host: 'aws-0-ap-northeast-1.pooler.supabase.com', port: 6543 },
    { host: 'db.gsvmgbdfdbcpoikpbrwp.supabase.co', port: 5432 },
    { host: 'gsvmgbdfdbcpoikpbrwp.supabase.co', port: 5432 }
];

targets.forEach(target => {
    const socket = new net.Socket();
    socket.setTimeout(3000);
    
    socket.connect(target.port, target.host, () => {
        console.log(`SUCCESS: ${target.host}:${target.port}`);
        socket.destroy();
    });

    socket.on('error', (err) => {
        console.log(`FAILED: ${target.host}:${target.port} - ${err.message}`);
        socket.destroy();
    });

    socket.on('timeout', () => {
        console.log(`TIMEOUT: ${target.host}:${target.port}`);
        socket.destroy();
    });
});
