(() => {
  'use strict';

  const urls = [
    'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:3677',
    'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:3723',
    'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:7163',
    'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:3843',
    'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:3841',
    'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:2597',
    'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:3853',
    'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:3854',
    'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:3855',
    'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:3856',
    'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:3861',
    'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:3863',
    'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:3865',
    'https://nocorion.rd.go.th/Orion/TrafficAnalysis/NetflowNodeDetails.aspx?NetObject=NN:3866'
  ];

  const urlBlock = urls.map(url => `    "${url}"`).join(',\n');

  const chromeScript = `$urls = @(\n${urlBlock}\n)\n\n$chromePaths = @(\n    "$env:ProgramFiles\\Google\\Chrome\\Application\\chrome.exe",\n    "${'${env:ProgramFiles(x86)}'}\\Google\\Chrome\\Application\\chrome.exe",\n    "$env:LOCALAPPDATA\\Google\\Chrome\\Application\\chrome.exe"\n)\n\n$chrome = $chromePaths |\n    Where-Object { Test-Path $_ } |\n    Select-Object -First 1\n\nif ($chrome) {\n    Start-Process -FilePath $chrome -ArgumentList (@("--new-window") + $urls)\n}\nelse {\n    Write-Host "ไม่พบ Google Chrome ในเครื่อง" -ForegroundColor Red\n    Read-Host "กด Enter เพื่อปิด"\n}`;

  const edgeScript = `$urls = @(\n${urlBlock}\n)\n\n$edgePaths = @(\n    "$env:ProgramFiles\\Microsoft\\Edge\\Application\\msedge.exe",\n    "${'${env:ProgramFiles(x86)}'}\\Microsoft\\Edge\\Application\\msedge.exe"\n)\n\n$edge = $edgePaths |\n    Where-Object { Test-Path $_ } |\n    Select-Object -First 1\n\nif ($edge) {\n    Start-Process -FilePath $edge -ArgumentList (@("--new-window") + $urls)\n}\nelse {\n    Write-Host "ไม่พบ Microsoft Edge ในเครื่อง" -ForegroundColor Red\n    Read-Host "กด Enter เพื่อปิด"\n}`;

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new Error('Copy command failed');
  }

  function bindCopy(buttonId, script, successText) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    button.addEventListener('click', async () => {
      const status = document.getElementById('netflowScriptStatus');
      try {
        await copyText(script);
        if (status) status.textContent = successText;
        const original = button.textContent;
        button.textContent = 'คัดลอกแล้ว';
        window.setTimeout(() => { button.textContent = original; }, 1800);
      } catch {
        if (status) status.textContent = 'คัดลอกไม่สำเร็จ กรุณาลองใหม่';
      }
    });
  }

  function init() {
    bindCopy('copyNetflowChromeScript', chromeScript, 'คัดลอก PowerShell สำหรับ Chrome แล้ว');
    bindCopy('copyNetflowEdgeScript', edgeScript, 'คัดลอก PowerShell สำหรับ Edge แล้ว');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
