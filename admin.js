if(sessionStorage.getItem('oa_admin')!=='yes') location.replace('admin-login.html');

const KEY='obsidian_arc_records_v1';
const SHEETS_WEB_APP_URL='https://script.google.com/macros/s/AKfycby7k-QT6oWy7zOClDqKXVqYRmDhGyhTKhokqb4Vdt7zs-YiZfC_xQV-O9GXW-7v4K3Qdw/exec';
const SHEETS_API_KEY='obsidian_arc_lab';
const sheetsEnabled=()=>SHEETS_WEB_APP_URL.startsWith('https://script.google.com/macros/s/')&&SHEETS_WEB_APP_URL.endsWith('/exec');
let data=JSON.parse(localStorage.getItem(KEY)||'{"orders":[],"expenses":[],"products":[],"inventory":[]}');
data.orders=data.orders||[];
data.orders.forEach(x=>{x.paymentStatus=x.paymentStatus||'Not Paid';x.amountPaid=x.amountPaid??(x.paymentStatus==='Paid'?x.amount:0);x.deliveryMethod=x.deliveryMethod||''});
data.expenses=data.expenses||[];
data.expenses.forEach(x=>{if(x.paidBy==='Company')x.paidBy='Obsidian Arc Lab'});
data.products=data.products||[];
data.inventory=Array.isArray(data.inventory)?data.inventory:[{id:1723612800000,updated:'2026-08-14T00:00:00.000Z',type:'Statue',name:'Mini Ganesha',size:'15 × 15 × 15 cm',material:'PLA',quantity:'3',minimum:'1',unit:'pcs',location:'',notes:''}];
const rm=n=>'RM'+Number(n||0).toFixed(2);
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
      if(remote.length)data[type]=remote;
      else if(data[type].length)firstUploads.push(sheetsRequest({action:'replaceAll',type,records:data[type]}));
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
    document.getElementById('pageTitle').textContent={overview:'Business overview',orders:'Customer orders',expenses:'Business expenses',products:'Product Price List',inventory:'Inventory Control'}[button.dataset.page];
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
toggleOther('inventoryType','customStockTypeWrap','customType');
toggleOther('productMaterial','customMaterialWrap','customMaterial');

const formSettings={
  orders:{form:'orderForm',page:'orders',label:'Save order',update:'Update order'},
  expenses:{form:'expenseForm',page:'expenses',label:'Save expense',update:'Update expense'},
  products:{form:'productForm',page:'products',label:'Save price record',update:'Update price record'},
  inventory:{form:'inventoryForm',page:'inventory',label:'Save inventory',update:'Update inventory'}
};

function resetForm(type){
  const settings=formSettings[type],form=document.getElementById(settings.form);
  form.reset();
  if(type==='orders') form.elements.namedItem('quantity').value=1;
  if(type==='products'){
    form.elements.namedItem('printingCost').value=0;form.elements.namedItem('packagingCost').value=0;form.elements.namedItem('otherCost').value=0;
    toggleOther('productMaterial','customMaterialWrap','customMaterial');updateLiveProfit();
  }
  if(type==='inventory'){
    form.elements.namedItem('quantity').value=0;form.elements.namedItem('minimum').value=1;
    toggleOther('inventoryType','customStockTypeWrap','customType');
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
  [...form.elements].forEach(field=>{if(field.name&&record[field.name]!==undefined)field.value=record[field.name]});
  if(type==='orders') form.elements.namedItem('paymentStatus').value=record.paymentStatus||'Not Paid';
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
    sheetsRequest({action:'delete',type,id}).then(()=>setSyncStatus('Deleted from Google Sheets')).catch(error=>setSyncStatus(error.message,true));
    save();
  }
}

function actions(type,id){return `<div class="record-actions"><button class="edit" onclick="editRecord('${type}',${id})">Edit</button><button class="delete" onclick="del('${type}',${id})">Delete</button></div>`}

function table(headers,rows){
  if(!rows.length) return '<p class="empty">No records yet. Your next creation starts here.</p>';
  return '<table class="data-table"><thead><tr>'+headers.map(h=>'<th>'+h+'</th>').join('')+'<th></th></tr></thead><tbody>'+rows.join('')+'</tbody></table>';
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

  document.getElementById('sales').textContent=rm(sales);
  document.getElementById('spent').textContent=rm(spent);
  document.getElementById('profit').textContent=rm(sales-spent);
  document.getElementById('open').textContent=pending+progress;
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

  const orderRows=data.orders.map(o=>{const delivery=[o.deliveryMethod,o.deliveryDate,o.trackingNumber].filter(Boolean).join(' · ');return `<tr><td>${o.date||(o.created?o.created.slice(0,10):'-')}</td><td><strong>${o.customer}</strong><small>${o.phone||''}</small></td><td>${o.product}<small>${o.notes||''}</small></td><td>${o.quantity}</td><td><span class="badge ${o.status.toLowerCase().replaceAll(' ','-')}">${o.status}</span></td><td><span class="payment-badge ${o.paymentStatus.toLowerCase().replaceAll(' ','-')}">${o.paymentStatus}</span><small>Paid ${rm(o.amountPaid)} · Balance ${rm(balanceFor(o))}</small></td><td>${delivery||'-'}<small>${o.address||''}</small></td><td class="money">${rm(o.amount)}</td><td>${actions('orders',o.id)}</td></tr>`});
  document.getElementById('orderList').innerHTML=table(['Order date','Customer','Product','Qty','Status','Payment','Delivery','Total'],orderRows);
  document.getElementById('recent').innerHTML=table(['Order date','Customer','Product','Qty','Status','Payment','Delivery','Total'],orderRows.slice(0,5));

  const expenseRows=data.expenses.map(x=>`<tr><td>${x.date}</td><td>${x.paidBy}</td><td>${x.category}</td><td>${x.description}</td><td class="money">${rm(x.amount)}</td><td>${actions('expenses',x.id)}</td></tr>`);
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
}

function exportData(){
  const esc=value=>'"'+String(value??'').replaceAll('"','""')+'"';
  const section=(name,items)=>{
    if(!items.length) return name+'\nNo records\n';
    const keys=Object.keys(items[0]);
    return name+'\n'+keys.map(esc).join(',')+'\n'+items.map(x=>keys.map(k=>esc(x[k])).join(',')).join('\n')+'\n';
  };
  const blob=new Blob(['\ufeff'+section('ORDERS',data.orders)+section('EXPENSES',data.expenses)+section('PRODUCTS',data.products)+section('INVENTORY',data.inventory)],{type:'text/csv'});
  const link=document.createElement('a');
  link.href=URL.createObjectURL(blob);
  link.download='obsidian-arc-business.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

calculatePrice();
render();
loadGoogleSheets();
