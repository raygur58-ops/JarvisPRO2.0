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
form.addEventListener('submit',e=>{e.preventDefault();const text=input.value.trim();if(!text)return;welcome.hidden=true;addMessage(text,'user');input.value='';input.style.height='auto';const typing=document.createElement('div');typing.className='message assistant';typing.innerHTML='<span class="message-label">JARVIS</span><span class="typing-dots"><i></i><i></i><i></i></span>';conversation.append(typing);conversation.scrollTop=conversation.scrollHeight;window.setTimeout(()=>{typing.remove();addMessage('Я на связи! Расскажи немного подробнее, и я постараюсь помочь.','assistant')},850)});
const modeButton=document.getElementById('modeButton'),modeMenu=document.getElementById('modeMenu');
modeButton.addEventListener('click',()=>{modeMenu.hidden=!modeMenu.hidden;modeButton.classList.toggle('open',!modeMenu.hidden)});
modeMenu.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{document.getElementById('modeLabel').textContent=button.dataset.mode;modeMenu.hidden=true;modeButton.classList.remove('open')}));
document.addEventListener('click',e=>{if(!e.target.closest('.chat-top')){modeMenu.hidden=true;modeButton.classList.remove('open')}});
document.getElementById('fileInput').addEventListener('change',e=>{const f=e.target.files[0];document.getElementById('fileName').textContent=f?f.name:''});
const mic=document.getElementById('mic');mic.addEventListener('click',()=>{const active=mic.classList.toggle('listening');mic.title=active?'Остановить голосовой ввод':'Голосовой ввод';if(active&&('webkitSpeechRecognition'in window||'SpeechRecognition'in window)){const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition,recognition=new Recognition();recognition.lang='ru-RU';recognition.onresult=event=>{input.value+=(input.value?' ':'')+event.results[0][0].transcript;input.dispatchEvent(new Event('input'))};recognition.onend=()=>{mic.classList.remove('listening');mic.title='Голосовой ввод'};recognition.onerror=recognition.onend;recognition.start()}else if(active){window.setTimeout(()=>{mic.classList.remove('listening');mic.title='Голосовой ввод'},1300)}});
const app=document.getElementById('appWindow');
document.getElementById('maximize').addEventListener('click',()=>{if(window.jarvisWindow)window.jarvisWindow.toggleMaximize();else app.classList.toggle('maximized')});
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
