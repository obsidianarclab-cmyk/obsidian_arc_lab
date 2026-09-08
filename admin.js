if(sessionStorage.getItem('oa_admin')!=='yes') location.replace('admin-login.html');

const KEY='obsidian_arc_records_v1';
const SHEETS_WEB_APP_URL='https://script.google.com/macros/s/AKfycbwoJcI043jIbkAdV5OUcQg7lBp4U5rMl5jXdmKVfIWOovNSncHYZXmIiQODUpqval0m/exec';
const SHEETS_API_KEY='Obsidian_Arc_Lab_Record';
const sheetsEnabled=()=>SHEETS_WEB_APP_URL.startsWith('https://script.google.com/macros/s/')&&SHEETS_WEB_APP_URL.endsWith('/exec');
let data=JSON.parse(localStorage.getItem(KEY)||'{"orders":[],"expenses":[],"products":[],"inventory":[],"work":[],"settings":{}}');
data.orders=data.orders||[];
data.orders.forEach(x=>{x.paymentStatus=x.paymentStatus||'Not Paid';x.amountPaid=x.amountPaid??(x.paymentStatus==='Paid'?x.amount:0);x.deliveryMethod=x.deliveryMethod||'';x.platform=x.platform||''});
data.expenses=data.expenses||[];
data.expenses.forEach(x=>{if(x.paidBy==='Company')x.paidBy='Obsidian Arc Lab'});
data.products=data.products||[];
data.work=Array.isArray(data.work)?data.work:[];
data.work.forEach(item=>{
  if(!item.created){
    const idDate=Number(item.id);
    item.created=item.updated||(Number.isFinite(idDate)&&idDate>0?new Date(idDate).toISOString():new Date().toISOString());
  }
  delete item.dueDate;
});
data.settings=(data.settings&&typeof data.settings==='object'&&!Array.isArray(data.settings))?data.settings:{};
data.settings.companyBalance=Number(data.settings.companyBalance||0);
data.settings.companyBalanceNote=data.settings.companyBalanceNote||'';
data.settings.companyBalanceUpdated=data.settings.companyBalanceUpdated||'';
data.inventory=Array.isArray(data.inventory)?data.inventory:[{id:1723612800000,updated:'2026-08-14T00:00:00.000Z',type:'Statue',name:'Mini Ganesha',size:'15 × 15 × 15 cm',material:'PLA',quantity:'3',minimum:'1',unit:'pcs',location:'',notes:''}];
localStorage.setItem(KEY,JSON.stringify(data));
const rm=n=>'RM'+Number(n||0).toFixed(2);
const MY_TIME_ZONE='Asia/Kuala_Lumpur';

function formatMYDate(value){
  if(value===undefined||value===null||value==='') return '-';
  const text=String(value).trim();
  const dateOnly=text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  const date=new Date(text);
  if(Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat('en-GB',{timeZone:MY_TIME_ZONE,day:'2-digit',month:'2-digit',year:'numeric'}).format(date);
}

function formatMYDateTime(value){
  if(value===undefined||value===null||value==='') return '-';
  const text=String(value).trim();
  const dateOnly=text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  const date=new Date(text);
  if(Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat('en-MY',{
    timeZone:MY_TIME_ZONE,day:'2-digit',month:'2-digit',year:'numeric',
    hour:'2-digit',minute:'2-digit',hour12:true
  }).format(date);
}

function toDateInputValue(value){
  if(value===undefined||value===null||value==='') return '';
  const text=String(value).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date=new Date(text);
  if(Number.isNaN(date.getTime())) return '';
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:MY_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const get=type=>parts.find(part=>part.type===type)?.value||'';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function setWorkDateDisplay(value=new Date().toISOString()){
  const field=document.getElementById('workCurrentDate');
  if(field)field.value=formatMYDate(value);
}

const save=()=>{localStorage.setItem(KEY,JSON.stringify(data));render()};
let editing={type:null,id:null};

async function sheetsRequest(payload){
  if(!sheetsEnabled())return null;
  const response=await fetch(SHEETS_WEB_APP_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({...payload,key:SHEETS_API_KEY})});
  const result=await response.json();
  if(!result.ok)throw new Error(result.error||'Google Sheets sync failed');
  return result;
}

function syncRecord(type,record){
  sheetsRequest({action:'upsert',type,record}).then(()=>setSyncStatus('Saved to Google Sheets')).catch(error=>setSyncStatus(error.message,true));
}

function setSyncStatus(message,error=false){
  const output=document.getElementById('syncStatus');
  if(!output)return;
  output.textContent=message;output.classList.toggle('sync-error',error);
}

async function loadGoogleSheets(){
  if(!sheetsEnabled()){setSyncStatus('Google Sheets not connected');return}
  setSyncStatus('Loading Google Sheets…');
  try{
    const response=await fetch(`${SHEETS_WEB_APP_URL}?key=${encodeURIComponent(SHEETS_API_KEY)}`);
    const result=await response.json();
    if(!result.ok)throw new Error(result.error||'Unable to load Google Sheets');
    const firstUploads=[];
    ['orders','expenses','products','inventory'].forEach(type=>{
      const remote=Array.isArray(result.data[type])?result.data[type]:[];
      if(remote.length){
        const localById=new Map((data[type]||[]).map(item=>[String(item.id),item]));
        data[type]=remote.map(item=>({...localById.get(String(item.id)),...item}));
      }else if(data[type].length){
        firstUploads.push(sheetsRequest({action:'replaceAll',type,records:data[type]}));
      }
    });
    await Promise.all(firstUploads);
    localStorage.setItem(KEY,JSON.stringify(data));render();setSyncStatus(firstUploads.length?'Connected — existing records uploaded':'Connected to Google Sheets');
  }catch(error){setSyncStatus(error.message,true)}
}

document.getElementById('todayText').textContent=new Date().toLocaleDateString('en-MY',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

function logout(){sessionStorage.removeItem('oa_admin');location.replace('admin-login.html')}

function goPage(page){
  const button=document.querySelector(`[data-page="${page}"]`);
  if(button) button.click();
  window.scrollTo({top:0,behavior:'smooth'});
}

document.querySelectorAll('nav [data-page]').forEach(button=>{
  button.onclick=()=>{
    document.querySelectorAll('nav [data-page]').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
    button.classList.add('active');
    document.getElementById(button.dataset.page).classList.add('active');
    document.getElementById('pageTitle').textContent={overview:'Business overview',orders:'Customer orders',expenses:'Business expenses',products:'Product Price List',inventory:'Inventory Control',work:'Work & Notes'}[button.dataset.page];
  };
});

function formObject(form){return Object.fromEntries(new FormData(form).entries())}

function storeRecord(type,record){
  const index=data[type].findIndex(x=>x.id===record.id);
  if(index>=0) data[type][index]=record;
  else data[type].unshift(record);
}

function currentRecord(type){return editing.type===type?data[type].find(x=>x.id===editing.id):null}

document.getElementById('orderForm').onsubmit=e=>{
  e.preventDefault();
  const order=formObject(e.target);
  if(order.platform==='Other') order.platform=order.customPlatform.trim();
  delete order.customPlatform;
  if(!order.platform){alert('Please select or key in where the order came from.');return}
  const existing=currentRecord('orders');
  order.id=existing?.id||Date.now();
  order.created=existing?.created||new Date().toISOString();
  storeRecord('orders',order);
  syncRecord('orders',order);
  resetForm('orders');
  save();
};

document.getElementById('expenseForm').onsubmit=e=>{
  e.preventDefault();
  const expense=formObject(e.target);
  const existing=currentRecord('expenses');
  expense.id=existing?.id||Date.now();
  storeRecord('expenses',expense);
  syncRecord('expenses',expense);
  resetForm('expenses');
  save();
};

document.getElementById('productForm').onsubmit=e=>{
  e.preventDefault();
  const product=formObject(e.target);
  if(product.material==='Other') product.material=product.customMaterial.trim();
  delete product.customMaterial;
  if(!product.material){alert('Please key in the material name.');return}
  const existing=currentRecord('products');
  product.id=existing?.id||Date.now();
  storeRecord('products',product);
  syncRecord('products',product);
  resetForm('products');
  save();
};

document.getElementById('inventoryForm').onsubmit=e=>{
  e.preventDefault();
  const item=formObject(e.target);
  if(item.type==='Other') item.type=item.customType.trim();
  delete item.customType;
  if(!item.type){alert('Please key in the stock type.');return}
  const existing=currentRecord('inventory');
  item.id=existing?.id||Date.now();
  item.updated=new Date().toISOString();
  storeRecord('inventory',item);
  syncRecord('inventory',item);
  resetForm('inventory');
  save();
};

document.getElementById('workForm').onsubmit=e=>{
  e.preventDefault();
  const item=formObject(e.target);
  if(item.category==='Other') item.category=item.customCategory.trim();
  delete item.customCategory;
  if(!item.category){alert('Please key in the work category.');return}
  const existing=currentRecord('work');
  item.id=existing?.id||Date.now();
  item.created=existing?.created||new Date().toISOString();
  item.updated=new Date().toISOString();
  storeRecord('work',item);
  resetForm('work');
  save();
};

function openBalanceEditor(){
  const modal=document.getElementById('balanceModal');
  document.getElementById('balanceInput').value=Number(data.settings.companyBalance||0).toFixed(2);
  document.getElementById('balanceNoteInput').value=data.settings.companyBalanceNote||'';
  modal.hidden=false;
  setTimeout(()=>document.getElementById('balanceInput').focus(),0);
}

function closeBalanceEditor(){document.getElementById('balanceModal').hidden=true}

document.getElementById('balanceModal').addEventListener('click',e=>{if(e.target.id==='balanceModal')closeBalanceEditor()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeBalanceEditor()});
document.getElementById('balanceForm').onsubmit=e=>{
  e.preventDefault();
  const values=formObject(e.target);
  data.settings.companyBalance=Math.max(Number(values.balance||0),0);
  data.settings.companyBalanceNote=values.note.trim();
  data.settings.companyBalanceUpdated=new Date().toISOString();
  closeBalanceEditor();
  save();
};

function productCost(product){
  if(product.printingCost!==undefined) return Number(product.printingCost||0)+Number(product.packagingCost||0)+Number(product.otherCost||0);
  return Number(product.cost||0);
}

function updateLiveProfit(){
  const form=document.getElementById('productForm');
  const price=Number(form.price.value||0);
  const cost=Number(form.printingCost.value||0)+Number(form.packagingCost.value||0)+Number(form.otherCost.value||0);
  const profit=price-cost;
  const output=document.getElementById('liveProfit');
  output.textContent=rm(profit);
  output.style.color=profit<0?'#d17b84':'#7fc59f';
}

document.getElementById('productForm').addEventListener('input',updateLiveProfit);

function calculatePrice(){
  const form=document.getElementById('calculatorForm');
  const values=formObject(form);
  const spoolWeight=Math.max(Number(values.spoolWeight||0),1);
  const material=Number(values.filamentUsed||0)/spoolWeight*Number(values.spoolPrice||0);
  const electricity=Number(values.printHours||0)*Number(values.electricityRate||0);
  const printing=material+electricity+Number(values.labour||0);
  const cost=printing+Number(values.packaging||0)+Number(values.other||0);
  const margin=Math.min(Math.max(Number(values.margin||0),0),95)/100;
  const selling=cost/(1-margin);
  const result={material,electricity,printing,cost,selling,profit:selling-cost,packaging:Number(values.packaging||0),other:Number(values.other||0)};
  document.getElementById('calcMaterial').textContent=rm(result.material);
  document.getElementById('calcCost').textContent=rm(result.cost);
  document.getElementById('calcSelling').textContent=rm(result.selling);
  document.getElementById('calcProfit').textContent=rm(result.profit);
  return result;
}

function applyCalculatedPrice(){
  const result=calculatePrice();
  const form=document.getElementById('productForm');
  form.printingCost.value=result.printing.toFixed(2);
  form.packagingCost.value=result.packaging.toFixed(2);
  form.otherCost.value=result.other.toFixed(2);
  form.price.value=result.selling.toFixed(2);
  updateLiveProfit();
  form.scrollIntoView({behavior:'smooth',block:'center'});
}

document.getElementById('calculatorForm').addEventListener('input',calculatePrice);

function toggleOther(selectId,wrapId,inputName){
  const select=document.getElementById(selectId);
  const wrap=document.getElementById(wrapId);
  const input=wrap.querySelector(`[name="${inputName}"]`);
  const show=select.value==='Other';
  wrap.hidden=!show;
  input.required=show;
  if(!show) input.value='';
}

document.getElementById('inventoryType').addEventListener('change',()=>toggleOther('inventoryType','customStockTypeWrap','customType'));
document.getElementById('productMaterial').addEventListener('change',()=>toggleOther('productMaterial','customMaterialWrap','customMaterial'));
document.getElementById('orderPlatform').addEventListener('change',()=>toggleOther('orderPlatform','customPlatformWrap','customPlatform'));
document.getElementById('workCategory').addEventListener('change',()=>toggleOther('workCategory','customWorkCategoryWrap','customCategory'));
toggleOther('inventoryType','customStockTypeWrap','customType');
toggleOther('productMaterial','customMaterialWrap','customMaterial');
toggleOther('orderPlatform','customPlatformWrap','customPlatform');
toggleOther('workCategory','customWorkCategoryWrap','customCategory');
setWorkDateDisplay();

const formSettings={
  orders:{form:'orderForm',page:'orders',label:'Save order',update:'Update order'},
  expenses:{form:'expenseForm',page:'expenses',label:'Save expense',update:'Update expense'},
  products:{form:'productForm',page:'products',label:'Save price record',update:'Update price record'},
  inventory:{form:'inventoryForm',page:'inventory',label:'Save inventory',update:'Update inventory'},
  work:{form:'workForm',page:'work',label:'Save work item',update:'Update work item'}
};

function resetForm(type){
  const settings=formSettings[type],form=document.getElementById(settings.form);
  form.reset();
  if(type==='orders'){form.elements.namedItem('quantity').value=1;form.elements.namedItem('amountPaid').value=0;form.elements.namedItem('platform').value='';toggleOther('orderPlatform','customPlatformWrap','customPlatform');}
  if(type==='products'){
    form.elements.namedItem('printingCost').value=0;form.elements.namedItem('packagingCost').value=0;form.elements.namedItem('otherCost').value=0;
    toggleOther('productMaterial','customMaterialWrap','customMaterial');updateLiveProfit();
  }
  if(type==='inventory'){
    form.elements.namedItem('quantity').value=0;form.elements.namedItem('minimum').value=1;
    toggleOther('inventoryType','customStockTypeWrap','customType');
  }
  if(type==='work'){
    form.elements.namedItem('priority').value='Normal';form.elements.namedItem('status').value='Pending';form.elements.namedItem('category').value='Business Task';
    toggleOther('workCategory','customWorkCategoryWrap','customCategory');
    setWorkDateDisplay();
  }
  form.querySelector('button:not([type="button"])').textContent=settings.label;
  form.querySelector('.cancel-edit')?.remove();
  editing={type:null,id:null};
}

function editRecord(type,id){
  const settings=formSettings[type],record=data[type].find(x=>x.id===id);
  if(!record)return;
  goPage(settings.page);
  const form=document.getElementById(settings.form);
  form.reset();
  [...form.elements].forEach(field=>{
    if(field.name&&record[field.name]!==undefined){
      field.value=field.type==='date'?toDateInputValue(record[field.name]):record[field.name];
    }
  });
  if(type==='orders'){
    form.elements.namedItem('paymentStatus').value=record.paymentStatus||'Not Paid';
    const platform=form.elements.namedItem('platform'),customPlatform=form.elements.namedItem('customPlatform');
    const known=[...platform.options].some(option=>option.value===record.platform);
    if(record.platform&&!known){platform.value='Other';customPlatform.value=record.platform}
    else platform.value=record.platform||'';
    toggleOther('orderPlatform','customPlatformWrap','customPlatform');
    if(platform.value==='Other')customPlatform.value=record.platform||'';
  }
  if(type==='products'){
    const material=form.elements.namedItem('material'),customMaterial=form.elements.namedItem('customMaterial');
    const known=[...material.options].some(option=>option.value===record.material);
    if(!known){material.value='Other';customMaterial.value=record.material||''}
    toggleOther('productMaterial','customMaterialWrap','customMaterial');updateLiveProfit();
  }
  if(type==='inventory'){
    const stockType=form.elements.namedItem('type'),customType=form.elements.namedItem('customType');
    const known=[...stockType.options].some(option=>option.value===record.type);
    if(!known){stockType.value='Other';customType.value=record.type||''}
    toggleOther('inventoryType','customStockTypeWrap','customType');
  }
  if(type==='work'){
    const category=form.elements.namedItem('category'),customCategory=form.elements.namedItem('customCategory');
    const known=[...category.options].some(option=>option.value===record.category);
    if(!known){category.value='Other';customCategory.value=record.category||''}
    toggleOther('workCategory','customWorkCategoryWrap','customCategory');
    if(category.value==='Other')customCategory.value=record.category||'';
    setWorkDateDisplay(record.created||record.updated);
  }
  editing={type,id};
  form.querySelector('button:not([type="button"])').textContent=settings.update;
  if(!form.querySelector('.cancel-edit')){
    const cancel=document.createElement('button');cancel.type='button';cancel.className='cancel-edit';cancel.textContent='Cancel edit';cancel.onclick=()=>resetForm(type);form.append(cancel);
  }
  form.scrollIntoView({behavior:'smooth',block:'center'});
}

function del(type,id){
  if(confirm('Delete this record?')){
    data[type]=data[type].filter(x=>x.id!==id);
    if(['orders','expenses','products','inventory'].includes(type)){
      sheetsRequest({action:'delete',type,id}).then(()=>setSyncStatus('Deleted from Google Sheets')).catch(error=>setSyncStatus(error.message,true));
    }
    save();
  }
}

function markWorkDone(id){
  const item=data.work.find(x=>x.id===id);
  if(!item)return;
  item.status='Done';item.updated=new Date().toISOString();save();
}

function actions(type,id){
  const done=type==='work'?`<button class="done-action" onclick="markWorkDone(${id})">✓ Done</button>`:'';
  return `<div class="record-actions">${done}<button class="edit" onclick="editRecord('${type}',${id})">Edit</button><button class="delete" onclick="del('${type}',${id})">Delete</button></div>`
}

function table(headers,rows){
  if(!rows.length) return '<p class="empty">No records yet. Your next creation starts here.</p>';
  const mobileHeaders=[...headers,'Actions'];
  const labelledRows=rows.map(row=>{
    let column=0;
    return row.replace(/<td([^>]*)>/g,(match,attrs)=>{
      const label=String(mobileHeaders[column++]||'')
        .replaceAll('&','&amp;')
        .replaceAll('"','&quot;')
        .replaceAll('<','&lt;')
        .replaceAll('>','&gt;');
      return `<td${attrs} data-label="${label}">`;
    });
  });
  return '<table class="data-table"><thead><tr>'+headers.map(h=>'<th>'+h+'</th>').join('')+'<th>Actions</th></tr></thead><tbody>'+labelledRows.join('')+'</tbody></table>';
}

function render(){
  const sales=data.orders.reduce((sum,o)=>sum+Number(o.amount||0),0);
  const spent=data.expenses.reduce((sum,x)=>sum+Number(x.amount||0),0);
  const pending=data.orders.filter(o=>o.status==='Pending').length;
  const progress=data.orders.filter(o=>o.status==='In Progress').length;
  const completed=data.orders.filter(o=>o.status==='Completed').length;
  const balanceFor=o=>Math.max(Number(o.amount||0)-Number(o.amountPaid||0),0);
  const unpaidOrders=data.orders.filter(o=>balanceFor(o)>0);
  const lowItems=data.inventory.filter(x=>Number(x.quantity||0)<=Number(x.minimum||0));
  const workPending=data.work.filter(x=>x.status==='Pending').length;
  const workProgress=data.work.filter(x=>x.status==='In Progress').length;
  const openWork=workPending+workProgress;

  document.getElementById('sales').textContent=rm(sales);
  document.getElementById('spent').textContent=rm(spent);
  document.getElementById('profit').textContent=rm(sales-spent);
  document.getElementById('open').textContent=pending+progress;
  document.getElementById('companyBalance').textContent=rm(data.settings.companyBalance);
  const balanceDetail=data.settings.companyBalanceNote||'Manual cash / bank balance';
  document.getElementById('companyBalanceNote').textContent=data.settings.companyBalanceUpdated?`${balanceDetail} · Updated ${formatMYDate(data.settings.companyBalanceUpdated)}`:balanceDetail;
  document.getElementById('workPending').textContent=openWork;
  document.getElementById('salesNote').textContent=`${data.orders.length} orders recorded`;
  document.getElementById('expenseNote').textContent=`${data.expenses.length} expenses recorded`;
  document.getElementById('unpaidBalance').textContent=rm(unpaidOrders.reduce((sum,o)=>sum+balanceFor(o),0));
  document.getElementById('unpaidNote').textContent=`${unpaidOrders.length} payments outstanding`;
  document.getElementById('lowStockCount').textContent=lowItems.length;
  document.getElementById('pendingCount').textContent=pending;
  document.getElementById('progressCount').textContent=progress;
  document.getElementById('completedCount').textContent=completed;
  document.getElementById('totalCount').textContent=data.orders.length;
  document.getElementById('chartSales').textContent=rm(sales);
  document.getElementById('chartExpenses').textContent=rm(spent);

  const max=Math.max(sales,spent,1);
  document.getElementById('salesBar').style.width=(sales/max*100)+'%';
  document.getElementById('expenseBar').style.width=(spent/max*100)+'%';

  const orderRows=data.orders.map(o=>{const delivery=[o.deliveryMethod,o.deliveryDate?formatMYDate(o.deliveryDate):'',o.trackingNumber].filter(Boolean).join(' · ');return `<tr><td>${formatMYDate(o.date||o.created)}</td><td><strong>${o.customer}</strong><small>${o.phone||''}</small></td><td>${o.platform||'-'}</td><td>${o.product}<small>${o.notes||''}</small></td><td>${o.quantity}</td><td><span class="badge ${o.status.toLowerCase().replaceAll(' ','-')}">${o.status}</span></td><td><span class="payment-badge ${o.paymentStatus.toLowerCase().replaceAll(' ','-')}">${o.paymentStatus}</span><small>Paid ${rm(o.amountPaid)} · Balance ${rm(balanceFor(o))}</small></td><td>${delivery||'-'}<small>${o.address||''}</small></td><td class="money">${rm(o.amount)}</td><td>${actions('orders',o.id)}</td></tr>`});
  document.getElementById('orderList').innerHTML=table(['Order date','Customer','Order from','Product','Qty','Status','Payment','Delivery','Total'],orderRows);
  document.getElementById('recent').innerHTML=table(['Order date','Customer','Order from','Product','Qty','Status','Payment','Delivery','Total'],orderRows.slice(0,5));

  const expenseRows=data.expenses.map(x=>`<tr><td>${formatMYDate(x.date)}</td><td>${x.paidBy}</td><td>${x.category}</td><td>${x.description}</td><td class="money">${rm(x.amount)}</td><td>${actions('expenses',x.id)}</td></tr>`);
  document.getElementById('expenseList').innerHTML=table(['Date','Used by','Category','Description','Amount'],expenseRows);

  const totalPrices=data.products.reduce((sum,p)=>sum+Number(p.price||0),0);
  const totalProfits=data.products.reduce((sum,p)=>sum+Number(p.price||0)-productCost(p),0);
  document.getElementById('pricedProductCount').textContent=data.products.length;
  document.getElementById('averagePrice').textContent=rm(data.products.length?totalPrices/data.products.length:0);
  document.getElementById('averageProfit').textContent=rm(data.products.length?totalProfits/data.products.length:0);
  const productRows=data.products.map(p=>{const cost=productCost(p),profit=Number(p.price||0)-cost;return `<tr><td><strong>${p.name}</strong><small>${p.notes||''}</small></td><td>${p.category||'-'}</td><td>${p.size||'-'}</td><td>${p.material||'-'}</td><td>${p.colour||'-'}</td><td class="money">${rm(cost)}</td><td class="money">${rm(p.price)}</td><td class="money">${rm(profit)}</td><td>${actions('products',p.id)}</td></tr>`});
  document.getElementById('productList').innerHTML=table(['Product','Category','Size','Material','Colour','Total cost','Selling price','Profit'],productRows);

  const stockTotal=type=>data.inventory.filter(x=>x.type===type).reduce((sum,x)=>sum+Number(x.quantity||0),0);
  document.getElementById('statueStock').textContent=stockTotal('Statue');
  document.getElementById('boxStock').textContent=stockTotal('Box');
  document.getElementById('plaStock').textContent=stockTotal('PLA');
  const inventoryRows=data.inventory.map(x=>{const low=Number(x.quantity||0)<=Number(x.minimum||0),typeClass=['Statue','Box','PLA'].includes(x.type)?x.type.toLowerCase():'other';return `<tr><td><span class="stock-type ${typeClass}">${x.type}</span></td><td><strong>${x.name}</strong><small>${x.notes||''}</small></td><td>${x.size||'-'}</td><td>${x.material||'-'}</td><td><strong class="${low?'low-stock':''}">${x.quantity} ${x.unit||''}</strong></td><td>${x.location||'-'}</td><td>${low?'<span class="stock-alert">Low stock</span>':'<span class="stock-ok">Available</span>'}</td><td>${actions('inventory',x.id)}</td></tr>`});
  document.getElementById('inventoryList').innerHTML=table(['Type','Item','Size','Material / colour','Available','Location','Status'],inventoryRows);

  document.getElementById('workPendingPage').textContent=workPending;
  document.getElementById('workProgressPage').textContent=workProgress;
  document.getElementById('workBuyPage').textContent=data.work.filter(x=>x.category==='Need to Buy'&&x.status!=='Done').length;
  document.getElementById('workWebsitePage').textContent=data.work.filter(x=>x.category==='Website Update'&&x.status!=='Done').length;
  const priorityClass=value=>String(value||'Normal').toLowerCase().replaceAll(' ','-');
  const workRows=data.work.map(x=>{const statusClass=x.status==='Done'?'completed':x.status.toLowerCase().replaceAll(' ','-');return `<tr><td><span class="work-category">${x.category}</span></td><td><strong>${x.title}</strong><small>${x.notes||''}</small></td><td><span class="priority-badge ${priorityClass(x.priority)}">${x.priority||'Normal'}</span></td><td><span class="badge ${statusClass}">${x.status}</span></td><td>${formatMYDate(x.created||x.updated)}</td><td>${actions('work',x.id)}</td></tr>`});
  document.getElementById('workList').innerHTML=table(['Category','Task / note','Priority','Status','Date added'],workRows);
}

function exportData(){
  const esc=value=>'"'+String(value??'').replaceAll('"','""')+'"';
  const section=(name,items)=>{
    if(!items.length) return name+'\nNo records\n';
    const keys=[...new Set(items.flatMap(item=>Object.keys(item)))];
    return name+'\n'+keys.map(esc).join(',')+'\n'+items.map(x=>keys.map(k=>esc(x[k])).join(',')).join('\n')+'\n';
  };
  const balanceExport=[{balance:data.settings.companyBalance,note:data.settings.companyBalanceNote,updated:data.settings.companyBalanceUpdated}];
  const blob=new Blob(['\ufeff'+section('ORDERS',data.orders)+section('EXPENSES',data.expenses)+section('PRODUCTS',data.products)+section('INVENTORY',data.inventory)+section('WORK & NOTES',data.work)+section('COMPANY BALANCE',balanceExport)],{type:'text/csv'});
  const link=document.createElement('a');
  link.href=URL.createObjectURL(blob);
  link.download='obsidian-arc-lab-business.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

calculatePrice();
render();
loadGoogleSheets();
