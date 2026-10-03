const canvas=document.getElementById('orb');
const ctx=canvas.getContext('2d');
let phase=0, width=0, height=0;

function resizeOrb(){
  const rect=canvas.getBoundingClientRect(), dpr=Math.min(window.devicePixelRatio||1,2);
  width=rect.width;height=rect.height;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
}
function drawOrb(){
  ctx.clearRect(0,0,width,height);const cx=width/2,cy=height/2,r=Math.min(width,height)*.39;
  const tilt=-.13+Math.sin(phase*.4)*.025, spin=phase*.17;
  const project=(lat,lon)=>{
    const x=Math.cos(lat)*Math.sin(lon+spin),y=Math.sin(lat),z=Math.cos(lat)*Math.cos(lon+spin);
    const yy=y*Math.cos(tilt)-z*Math.sin(tilt),zz=y*Math.sin(tilt)+z*Math.cos(tilt);
    return {x:cx+r*x,y:cy-r*yy,z:zz,alpha:Math.max(0,.19+((zz+1)/2)*.81)};
  };
  // Curves of latitude
  for(let i=-7;i<=7;i++){
    const lat=i*Math.PI/17, grad=ctx.createLinearGradient(cx-r,cy,cx+r,cy);
    grad.addColorStop(0,'rgba(30,255,245,.78)');grad.addColorStop(.5,'rgba(81,236,255,.58)');grad.addColorStop(1,'rgba(210,144,255,.7)');
    ctx.beginPath();let open=false;
    for(let j=0;j<=180;j++){
      const p=project(lat,j*Math.PI*2/180),visible=p.z>-.13;
      if(!visible){open=false;continue}if(!open){ctx.moveTo(p.x,p.y);open=true}else ctx.lineTo(p.x,p.y);
    }
    ctx.strokeStyle=grad;ctx.globalAlpha=.34+Math.cos(lat)*.32;ctx.lineWidth=i===0?1.35:.72;ctx.stroke();
  }
  // Meridians
  for(let i=0;i<28;i++){
    const lon=i*Math.PI*2/28, grad=ctx.createLinearGradient(cx,cy-r,cx,cy+r);
    grad.addColorStop(0,'rgba(69,244,255,.7)');grad.addColorStop(.55,'rgba(104,215,255,.52)');grad.addColorStop(1,'rgba(209,147,255,.74)');
    ctx.beginPath();let open=false;
    for(let j=0;j<=120;j++){
      const p=project(-Math.PI/2+j*Math.PI/120,lon),visible=p.z>-.18;
      if(!visible){open=false;continue}if(!open){ctx.moveTo(p.x,p.y);open=true}else ctx.lineTo(p.x,p.y);
    }
    ctx.strokeStyle=grad;ctx.globalAlpha=.25+.5*((Math.sin(lon+spin)+1)/2);ctx.lineWidth=.7;ctx.stroke();
  }
  ctx.globalAlpha=1;
  const glow=ctx.createRadialGradient(cx-r*.53,cy-r*.58,0,cx,cy,r*1.25);glow.addColorStop(0,'#40ebff13');glow.addColorStop(.68,'#66c8ff0b');glow.addColorStop(1,'#dfaaff13');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();
  phase+=.006;
  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)requestAnimationFrame(drawOrb);
}
resizeOrb();drawOrb();window.addEventListener('resize',resizeOrb);

const form=document.getElementById('composer'),input=document.getElementById('prompt'),conversation=document.getElementById('conversation'),welcome=document.getElementById('welcome');
input.addEventListener('input',()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,120)+'px'});
function addMessage(text,kind){const el=document.createElement('div');el.className=`message ${kind}`;const label=document.createElement('span');label.className='message-label';label.textContent=kind==='user'?'ВЫ':'JARVIS';el.append(label,document.createTextNode(text));conversation.append(el);conversation.scrollTop=conversation.scrollHeight;return el}
function readHistory(){try{return JSON.parse(localStorage.getItem('jarvis.chatHistory')||'[]')}catch{return[]}}
function saveHistory(text){const history=readHistory();history.unshift(text);localStorage.setItem('jarvis.chatHistory',JSON.stringify(history.slice(0,20)))}
let chatMessages=[],apiKeyConfigured=false;
async function submitPrompt(value=input.value){
  const text=value.trim();if(!text)return;
  if(!window.jarvisWindow){addMessage('Запустите Jarvis Pro как приложение, чтобы подключиться к OpenRouter.','assistant');return}
  saveHistory(text);welcome.hidden=true;addMessage(text,'user');input.value='';input.style.height='auto';document.getElementById('historyPopover').hidden=true;
  chatMessages.push({role:'user',content:text});
  const typing=document.createElement('div');typing.className='message assistant';typing.innerHTML='<span class="message-label">JARVIS</span><span class="typing-dots"><i></i><i></i><i></i></span>';conversation.append(typing);conversation.scrollTop=conversation.scrollHeight;
  try{
    const systemText=codeMode?'Ты Jarvis, полезный ИИ-помощник. Отвечай по-русски. В режиме кода давай точные решения, код в Markdown и кратко объясняй важные детали.':'Ты Jarvis, личный ИИ-помощник. Отвечай ясно и по-русски.';
    const messages=[{role:'system',content:systemText},...chatMessages.slice(-24)];
    const answer=await window.jarvisWindow.sendMessage(messages);typing.remove();chatMessages.push({role:'assistant',content:answer});addMessage(answer,'assistant');
  }catch(error){typing.remove();addMessage(error.message||'Не удалось связаться с OpenRouter.','assistant');if(/api-ключ/i.test(error.message))openSettings()}
}
form.addEventListener('submit',e=>{e.preventDefault();submitPrompt()});
const modeButton=document.getElementById('modeButton'),modeMenu=document.getElementById('modeMenu');
modeButton.addEventListener('click',()=>{modeMenu.hidden=!modeMenu.hidden;modeButton.classList.toggle('open',!modeMenu.hidden)});
modeMenu.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{document.getElementById('modeLabel').textContent=button.dataset.mode;modeMenu.hidden=true;modeButton.classList.remove('open')}));
document.addEventListener('click',e=>{if(!e.target.closest('.chat-top')){modeMenu.hidden=true;modeButton.classList.remove('open')}});
const historyButton=document.getElementById('historyButton'),historyPopover=document.getElementById('historyPopover');
historyButton.addEventListener('click',()=>{historyPopover.hidden=!historyPopover.hidden;if(historyPopover.hidden)return;historyPopover.replaceChildren();const heading=document.createElement('div');heading.className='history-title';heading.textContent='Недавние запросы';historyPopover.append(heading);const history=readHistory();if(!history.length){const empty=document.createElement('div');empty.className='history-empty';empty.textContent='Здесь появятся ваши запросы';historyPopover.append(empty)}history.forEach(text=>{const item=document.createElement('button');item.type='button';item.className='history-item';item.textContent=text;item.title=text;item.addEventListener('click',()=>{input.value=text;input.dispatchEvent(new Event('input'));input.focus();historyPopover.hidden=true});historyPopover.append(item)})});
document.addEventListener('click',e=>{if(!e.target.closest('.history-popover')&&!e.target.closest('#historyButton'))historyPopover.hidden=true});
const codeButton=document.getElementById('codeButton');let codeMode=false;
codeButton.addEventListener('click',()=>{codeMode=!codeMode;codeButton.classList.toggle('active',codeMode);codeButton.setAttribute('aria-pressed',String(codeMode));document.getElementById('modeLabel').textContent=codeMode?'Режим кода':'Личный помощник';input.placeholder=codeMode?'Опишите задачу по коду…':'Чем могу помочь сегодня?'});
const mic=document.getElementById('mic'),voiceMode=document.getElementById('voiceMode');
let recorder=null,recordStream=null,recordChunks=[],recordingPurpose='dictation',recordingTimer=null;
function setRecordingState(active){mic.classList.toggle('listening',active);mic.title=active?'Остановить запись':'Голосовой ввод';voiceMode.classList.toggle('active',active&&recordingPurpose==='send');voiceMode.setAttribute('aria-pressed',String(active&&recordingPurpose==='send'))}
function bytesToBase64(buffer){let binary='';const bytes=new Uint8Array(buffer);for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(binary)}
async function beginRecording(purpose){
  if(!window.jarvisWindow)return addMessage('Голосовой ввод доступен в установленном приложении.','assistant');
  try{
    if(!apiKeyConfigured){openSettings();throw new Error('Добавьте API-ключ OpenRouter, чтобы распознавать речь.')}
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('Запись аудио недоступна. Проверьте разрешение микрофона Windows.');
    recordStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    const preferred='audio/webm;codecs=opus',mimeType=MediaRecorder.isTypeSupported(preferred)?preferred:'audio/webm';
    recorder=new MediaRecorder(recordStream,{mimeType});recordChunks=[];recordingPurpose=purpose;
    recorder.ondataavailable=event=>{if(event.data.size)recordChunks.push(event.data)};
    recorder.onerror=()=>{setRecordingState(false);addMessage('Ошибка записи. Проверьте подключение микрофона.','assistant')};
    recorder.onstop=async()=>{
      clearTimeout(recordingTimer);recordStream?.getTracks().forEach(track=>track.stop());recordStream=null;setRecordingState(false);
      const chunks=recordChunks;recordChunks=[];recorder=null;
      if(!chunks.length)return;
      addMessage('Распознаю речь…','assistant');
      try{
        const blob=new Blob(chunks,{type:mimeType}),data=bytesToBase64(await blob.arrayBuffer());
        const transcript=await window.jarvisWindow.transcribeAudio(data,'webm');
        if(purpose==='send'){input.value=transcript;input.dispatchEvent(new Event('input'));await submitPrompt(transcript)}
        else{input.value+=(input.value?' ':'')+transcript;input.dispatchEvent(new Event('input'));input.focus()}
      }catch(error){addMessage(error.message||'Не удалось распознать запись.','assistant')}
    };
    recorder.start();setRecordingState(true);recordingTimer=setTimeout(()=>{if(recorder?.state==='recording')recorder.stop()},30000);
  }catch(error){recordStream?.getTracks().forEach(track=>track.stop());recordStream=null;setRecordingState(false);addMessage(error.message||'Не удалось запустить микрофон.','assistant')}
}
function stopRecording(){if(recorder?.state==='recording')recorder.stop()}
mic.addEventListener('click',()=>recorder?.state==='recording'?stopRecording():beginRecording('dictation'));
voiceMode.addEventListener('click',()=>recorder?.state==='recording'?stopRecording():beginRecording('send'));

const settingsOverlay=document.getElementById('settingsOverlay'),settingsButton=document.getElementById('settingsButton'),apiKeyInput=document.getElementById('apiKeyInput'),modelInput=document.getElementById('modelInput'),transcriptionModelInput=document.getElementById('transcriptionModelInput'),keyStatus=document.getElementById('keyStatus'),settingsFeedback=document.getElementById('settingsFeedback');
async function openSettings(){settingsOverlay.hidden=false;settingsFeedback.textContent='';apiKeyInput.value='';try{const settings=await window.jarvisWindow.getSettings();apiKeyConfigured=settings.apiKeyConfigured;modelInput.value=settings.model;transcriptionModelInput.value=settings.transcriptionModel;keyStatus.textContent=apiKeyConfigured?'Ключ сохранён на этом компьютере':'Ключ ещё не добавлен'}catch(error){settingsFeedback.textContent=error.message}}
settingsButton.addEventListener('click',openSettings);
document.getElementById('settingsClose').addEventListener('click',()=>{settingsOverlay.hidden=true});
settingsOverlay.addEventListener('click',event=>{if(event.target===settingsOverlay)settingsOverlay.hidden=true});
document.getElementById('getApiKey').addEventListener('click',event=>{event.preventDefault();window.jarvisWindow?.openApiKeyPage()});
document.getElementById('saveSettings').addEventListener('click',async()=>{
  settingsFeedback.textContent='Сохраняю…';
  try{const result=await window.jarvisWindow.saveSettings({apiKey:apiKeyInput.value,model:modelInput.value,transcriptionModel:transcriptionModelInput.value});apiKeyConfigured=result.apiKeyConfigured;apiKeyInput.value='';keyStatus.textContent=apiKeyConfigured?'Ключ сохранён на этом компьютере':'Ключ ещё не добавлен';settingsFeedback.textContent='Сохранено'}catch(error){settingsFeedback.textContent=error.message}
});
document.getElementById('removeApiKey').addEventListener('click',async()=>{
  settingsFeedback.textContent='';
  try{const result=await window.jarvisWindow.saveSettings({clearApiKey:true,model:modelInput.value,transcriptionModel:transcriptionModelInput.value});apiKeyConfigured=result.apiKeyConfigured;apiKeyInput.value='';keyStatus.textContent='Ключ удалён';settingsFeedback.textContent=''}catch(error){settingsFeedback.textContent=error.message}
});
document.addEventListener('keydown',event=>{if(event.key==='Escape')settingsOverlay.hidden=true});
window.jarvisWindow?.getSettings().then(settings=>{apiKeyConfigured=settings.apiKeyConfigured}).catch(()=>{});
const app=document.getElementById('appWindow');
document.getElementById('minimize').addEventListener('click',()=>{if(window.jarvisWindow)window.jarvisWindow.minimize();else{app.classList.add('minimized');window.setTimeout(()=>app.classList.remove('minimized'),900)}});
const overlay=document.getElementById('closeOverlay');
document.getElementById('close').addEventListener('click',()=>{if(window.jarvisWindow)window.jarvisWindow.close();else overlay.hidden=false});
document.getElementById('reopen').addEventListener('click',()=>overlay.hidden=true);

if(window.jarvisWindow?.onUpdateStatus){
  const toast=document.getElementById('updateToast'),title=document.getElementById('updateTitle'),message=document.getElementById('updateMessage'),install=document.getElementById('installUpdate');
  window.jarvisWindow.onUpdateStatus(({status,version,percent,message:errorMessage})=>{
    toast.hidden=false;toast.classList.toggle('ready',status==='ready');install.hidden=status!=='ready';
    if(status==='available'){title.textContent='Найдено обновление';message.textContent=`Версия ${version} загружается автоматически.`}
    if(status==='progress'){title.textContent='Загрузка обновления';message.textContent=`Готово ${percent}%`}
    if(status==='ready'){title.textContent='Обновление готово';message.textContent=`Версия ${version} установится после перезапуска.`}
    if(status==='error'){title.textContent='Обновление недоступно';message.textContent=errorMessage||'Проверьте подключение к интернету.'}
  });
  install.addEventListener('click',()=>window.jarvisWindow.installUpdate());
  document.getElementById('dismissUpdate').addEventListener('click',()=>{toast.hidden=true});
}
