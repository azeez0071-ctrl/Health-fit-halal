const HEIGHT_M=1.65, START_WEIGHT=80, GOAL_WEIGHT=65;
const foods=[
{name:"Chicken rice",cal:620,protein:28,tag:"Hawker"},
{name:"Chicken rice, half rice/no skin",cal:430,protein:27,tag:"Better choice"},
{name:"Nasi lemak with fried chicken",cal:850,protein:26,tag:"Hawker"},
{name:"Nasi padang grilled chicken + 2 veg + half rice",cal:520,protein:32,tag:"Better choice"},
{name:"Mee soto",cal:430,protein:20,tag:"Hawker"},
{name:"Soto ayam, less lontong",cal:340,protein:24,tag:"Better choice"},
{name:"Briyani chicken",cal:780,protein:30,tag:"Hawker"},
{name:"Briyani, half rice",cal:560,protein:29,tag:"Better choice"},
{name:"Fish soup with noodles",cal:420,protein:28,tag:"Hawker"},
{name:"Fish soup, less noodles",cal:300,protein:28,tag:"Better choice"},
{name:"Yong tau foo soup, 7 pieces",cal:380,protein:24,tag:"Better choice"},
{name:"Mee goreng",cal:730,protein:20,tag:"Hawker"},
{name:"Roti prata, 2 plain + curry",cal:620,protein:14,tag:"Hawker"},
{name:"Murtabak chicken",cal:950,protein:35,tag:"Hawker"},
{name:"Ikan bakar + veg + half rice",cal:500,protein:34,tag:"Better choice"},
{name:"2 soft-boiled eggs + 2 toast",cal:350,protein:18,tag:"Breakfast"}
];
const $=id=>document.getElementById(id);
const get=(k,d)=>JSON.parse(localStorage.getItem(k)||JSON.stringify(d));
const set=(k,v)=>localStorage.setItem(k,JSON.stringify(v));

function showTab(id,btn){
 document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
 document.querySelectorAll('nav button').forEach(x=>x.classList.remove('active'));
 $(id).classList.add('active'); btn.classList.add('active');
}
function renderDashboard(){
 const weights=get('weights',[]);
 const latest=weights.length?Number(weights.sort((a,b)=>a.date.localeCompare(b.date)).at(-1).weight):START_WEIGHT;
 const bmi=latest/(HEIGHT_M*HEIGHT_M), lost=Math.max(0,START_WEIGHT-latest), rem=Math.max(0,latest-GOAL_WEIGHT);
 $('latestWeight').textContent=latest.toFixed(1)+' kg';
 $('bmi').textContent=bmi.toFixed(1);
 $('lost').textContent=lost.toFixed(1)+' kg';
 $('remaining').textContent=rem.toFixed(1)+' kg';
 $('bar').style.width=Math.min(100,Math.max(0,lost/(START_WEIGHT-GOAL_WEIGHT)*100))+'%';
 const today=new Date().toISOString().slice(0,10);
 const log=get('foodlog',[]).filter(x=>x.date===today);
 $('todayCalories').textContent=log.reduce((s,x)=>s+Number(x.calories||0),0)+' kcal';
 $('todayProtein').textContent=log.reduce((s,x)=>s+Number(x.protein||0),0)+' g';
}
function logWeight(){
 const date=$('wDate').value, weight=$('wWeight').value, waist=$('wWaist').value, steps=$('wSteps').value;
 if(!date||!weight)return alert('Enter date and weight.');
 let arr=get('weights',[]).filter(x=>x.date!==date);
 arr.push({date,weight:Number(weight),waist,steps});
 set('weights',arr); renderDashboard(); renderHistory(); alert('Progress saved.');
}
function renderFoods(q=''){
 const list=foods.filter(f=>f.name.toLowerCase().includes(q.toLowerCase()));
 $('foodResults').innerHTML=list.map((f,i)=>`<div class="food-item"><strong>${f.name}</strong><span class="small">${f.cal} kcal • ${f.protein} g protein • ${f.tag}</span><button class="action secondary" onclick="addFood(${foods.indexOf(f)})">Add to today</button></div>`).join('')||'<p class="small">No match found.</p>';
}
function addFood(i){
 const f=foods[i], date=new Date().toISOString().slice(0,10);
 const arr=get('foodlog',[]); arr.push({date,name:f.name,calories:f.cal,protein:f.protein}); set('foodlog',arr);
 renderDashboard(); renderFoodLog(); alert('Food added.');
}
function addEstimate(){
 const name=$('estimateName').value||'Photo food estimate';
 const calories=Number($('estimateCalories').value||0), protein=Number($('estimateProtein').value||0);
 if(!calories)return alert('Enter estimated calories.');
 const date=new Date().toISOString().slice(0,10);
 const arr=get('foodlog',[]); arr.push({date,name,calories,protein}); set('foodlog',arr);
 renderDashboard(); renderFoodLog(); alert('Estimate added.');
}
function previewPhoto(e){
 const file=e.target.files[0]; if(!file)return;
 const img=$('photoPreview'); img.src=URL.createObjectURL(file); img.style.display='block';
 $('photoHint').textContent='Photo loaded. Select the closest food below or enter your estimate.';
}
async function scanBarcode(){
 if(!('BarcodeDetector' in window)){alert('Live barcode scanning is not supported in this browser. Use manual barcode entry.');return;}
 try{
  const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
  const video=document.createElement('video'); video.srcObject=stream; await video.play();
  const detector=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e']});
  const loop=async()=>{
    const codes=await detector.detect(video);
    if(codes.length){ stream.getTracks().forEach(t=>t.stop()); $('barcode').value=codes[0].rawValue; lookupBarcode(); return; }
    requestAnimationFrame(loop);
  }; loop();
 }catch(e){alert('Camera permission was not available. Use manual barcode entry.');}
}
async function lookupBarcode(){
 const code=$('barcode').value.trim(); if(!code)return alert('Enter a barcode.');
 $('barcodeResult').innerHTML='<p class="small">Checking product...</p>';
 try{
  const r=await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
  const d=await r.json();
  if(!d.product) throw new Error();
  const p=d.product, kcal=Math.round(p.nutriments?.['energy-kcal_100g']||0);
  const protein=Math.round(p.nutriments?.proteins_100g||0);
  $('barcodeResult').innerHTML=`<div class="food-item"><strong>${p.product_name||'Product found'}</strong><span class="small">${kcal} kcal and ${protein} g protein per 100 g</span><button class="action secondary" onclick="addBarcode('${(p.product_name||'Packaged food').replace(/'/g,"")} ',${kcal},${protein})">Add 100 g</button></div>`;
 }catch(e){$('barcodeResult').innerHTML='<div class="notice">Product not found. You can enter it manually in the photo estimate section.</div>'}
}
function addBarcode(name,cal,protein){
 const date=new Date().toISOString().slice(0,10), arr=get('foodlog',[]);
 arr.push({date,name,calories:cal,protein}); set('foodlog',arr); renderDashboard(); renderFoodLog(); alert('Product added.');
}
function renderFoodLog(){
 const arr=get('foodlog',[]).slice().reverse();
 $('foodLog').innerHTML=arr.map(x=>`<tr><td>${x.date}</td><td>${x.name}</td><td>${x.calories}</td><td>${x.protein||0}</td></tr>`).join('')||'<tr><td colspan="4">No food logged.</td></tr>';
}
function renderHistory(){
 const arr=get('weights',[]).slice().sort((a,b)=>b.date.localeCompare(a.date));
 $('history').innerHTML=arr.map(x=>`<tr><td>${x.date}</td><td>${x.weight}</td><td>${x.waist||''}</td><td>${x.steps||''}</td></tr>`).join('')||'<tr><td colspan="4">No entries.</td></tr>';
}
function saveReminder(){
 const t=$('reminderTime').value, text=$('reminderText').value;
 set('reminder',{t,text}); alert('Reminder preference saved.');
}
function exportCSV(){
 const w=get('weights',[]), f=get('foodlog',[]);
 const rows=[['TYPE','DATE','NAME/WEIGHT','CALORIES/WAIST','PROTEIN/STEPS']];
 w.forEach(x=>rows.push(['WEIGHT',x.date,x.weight,x.waist||'',x.steps||'']));
 f.forEach(x=>rows.push(['FOOD',x.date,x.name,x.calories,x.protein||0]));
 const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
 const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='azeez_fit_ai.csv'; a.click();
}
function clearAll(){
 if(confirm('Delete all saved data?')){localStorage.clear(); location.reload();}
}
document.addEventListener('DOMContentLoaded',()=>{
 const today=new Date().toISOString().slice(0,10); $('wDate').value=today;
 renderDashboard(); renderFoods(); renderFoodLog(); renderHistory();
 $('foodSearch').addEventListener('input',e=>renderFoods(e.target.value));
});
if('serviceWorker' in navigator){navigator.serviceWorker.register('./service-worker.js');}