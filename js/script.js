const $ = sel => document.querySelector(sel);
let trabajos = [];

function uid(){return Math.random().toString(36).slice(2)+Date.now().toString(36);}
function hoyISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function guardar(){ localStorage.setItem("taller", JSON.stringify(trabajos)); }
function cargar(){ trabajos = JSON.parse(localStorage.getItem("taller")||"[]"); render(); $('#fIngreso').value=hoyISO(); }

function actualizarStats(){
    const deuda = trabajos.reduce((s,t)=>s+t.saldoPendiente,0);
    const activos = trabajos.filter(t=>t.estado==="activo").length;
    const finalizados = trabajos.filter(t=>t.estado==="finalizado").length;
    $('#statDeuda').textContent = "$"+deuda.toFixed(2);
    $('#statActivos').textContent = activos;
    $('#statFinalizados').textContent = finalizados;
}

function render(filtro=""){
    const tbody=$('#tbody'); tbody.innerHTML='';
    let lista = trabajos;
    if(filtro.trim()!==""){
        const f = filtro.toLowerCase();
        lista = trabajos.filter(t=> t.cliente.toLowerCase().includes(f) || t.producto.toLowerCase().includes(f) || (t.contacto && t.contacto.toLowerCase().includes(f)) || (t.descripcion && t.descripcion.toLowerCase().includes(f)) );
    }
    lista.forEach(t=>{
        const estadoHTML = t.estado==='activo' ? '<span class="tag status-act">🟢 Activo</span>' : '<span class="tag status-fin">🔴 Finalizado</span>';
        const tr=document.createElement("tr");
        tr.innerHTML=`
<td><b>${t.cliente}</b><div class="muted">Remito: ${t.remito}</div><div class="muted">${t.contacto||''}</div></td>
<td>${t.producto}<div class="muted">${t.descripcion||''}</div></td>
<td>${t.fIngreso}</td>
<td>${t.fSalida||'-'}</td>
<td>
<div><span class="tag">${t.pago}</span></div>
<div style="font-size:12px">
 Total: <input type="number" class="editable" value="${t.montoTotal}" onchange="actualizarMonto('${t.id}','total',this.value)"><br>
 Pagado: <input type="number" class="editable" value="${t.montoPagado}" onchange="actualizarMonto('${t.id}','pagado',this.value)"><br>
 Deuda: <span id="deuda-${t.id}">$${t.saldoPendiente.toFixed(2)}</span>
</div>
</td>
<td id="estado-${t.id}">${estadoHTML}</td>
<td>${t.foto ? `<img src="${t.foto}" class="thumb" onclick="verFoto('${t.id}')">`:'-'}</td>
<td>
<button class="btn-warn" onclick="editar('${t.id}')">Editar</button>
<button class="btn-finish" onclick="marcarFinalizado('${t.id}')">Finalizar</button>
<button class="btn-danger" onclick="borrar('${t.id}')">Borrar</button>
${t.estado==="finalizado"?`<button class="btn-factura" onclick="generarFactura('${t.id}')">Factura</button>`:''}
</td>`;
        tbody.appendChild(tr);
    });
    $('#emptyMsg').hidden = lista.length>0;
    actualizarStats();
}

function actualizarMonto(id,tipo,valor){
    const t = trabajos.find(x=>x.id===id); if(!t) return;
    if(tipo==="total") t.montoTotal = parseFloat(valor)||0;
    if(tipo==="pagado") t.montoPagado = parseFloat(valor)||0;
    t.saldoPendiente = t.montoTotal - t.montoPagado;
    if(t.saldoPendiente <= 0 && t.fSalida){ t.estado = "finalizado"; } else { t.estado = "activo"; }
    guardar(); render($('#search').value);
}

function marcarFinalizado(id){
    const t = trabajos.find(x=>x.id===id); if(!t) return;
    t.estado="finalizado";
    if(!t.fSalida) t.fSalida = hoyISO();
    guardar(); render($('#search').value);
}

$('#form').addEventListener("submit", e=>{
    e.preventDefault();
    const id = $('#form').dataset.editing || uid();
    const fotoFile = $('#foto').files[0];
    const anterior = trabajos.find(x=>x.id===id);

    if(fotoFile){
        const reader = new FileReader();
        reader.onloadend = ()=>{ guardarTrabajo(reader.result); };
        reader.readAsDataURL(fotoFile);
    } else {
        guardarTrabajo(anterior?.foto || null);
    }

    function guardarTrabajo(foto){
        const montoTotal = parseFloat($('#montoTotal').value)||0;
        const montoPagado = parseFloat($('#montoPagado').value)||0;
        const saldo = montoTotal - montoPagado;
        let proximoRemito = trabajos.length>0?Math.max(...trabajos.map(t=>t.remito||0))+1:1;

        const trabajo = {
            id,
            remito: $('#form').dataset.editing ? anterior.remito : proximoRemito,
            cliente: $('#cliente').value,
            contacto: $('#contacto').value,
            producto: $('#producto').value,
            descripcion: $('#descripcion').value,
            fIngreso: $('#fIngreso').value,
            fSalida: $('#fSalida').value,
            pago: $('#pago').value,
            montoTotal,
            montoPagado,
            saldoPendiente: saldo,
            estado: (saldo<=0 && $('#fSalida').value)? "finalizado" : "activo",
            foto,
            fotoFinal: anterior?.fotoFinal || null
        };

        if($('#form').dataset.editing){
            trabajos = trabajos.map(t=>t.id===id?trabajo:t);
            delete $('#form').dataset.editing;
        } else { trabajos.push(trabajo); }

        guardar(); render($('#search').value);
        $('#form').reset();
        $('#fIngreso').value=hoyISO();
    }
});

function editar(id){
    const t = trabajos.find(x=>x.id===id); if(!t) return;
    $('#cliente').value=t.cliente;
    $('#contacto').value=t.contacto;
    $('#producto').value=t.producto;
    $('#descripcion').value=t.descripcion;
    $('#fIngreso').value=t.fIngreso;
    $('#fSalida').value=t.fSalida;
    $('#pago').value=t.pago;
    $('#montoTotal').value=t.montoTotal;
    $('#montoPagado').value=t.montoPagado;
    $('#form').dataset.editing=id;
}

function borrar(id){ if(confirm("¿Borrar trabajo?")){ trabajos = trabajos.filter(t=>t.id!==id); guardar(); render($('#search').value); } }
function verFoto(id){ const t=trabajos.find(x=>x.id===id); if(t?.foto){ const w=window.open(""); w.document.write(`<img src="${t.foto}" style="max-width:100%">`); } }
$('#search').addEventListener('input', e => render(e.target.value));

async function generarFactura(id){
    const t = trabajos.find(x=>x.id===id);
    if(!t) return;

    // Pedir foto final si no existe
    if(!t.fotoFinal){
        const input = document.createElement('input');
        input.type='file';
        input.accept='image/*';
        input.onchange = e => {
            const file = e.target.files[0];
            if(file){
                const reader = new FileReader();
                reader.onloadend = ()=>{
                    t.fotoFinal = reader.result;
                    guardar();
                    generarFactura(id);
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18); doc.setTextColor(0,0,0);
    doc.text("Lalo Part'S", 105, 15, {align:"center"});
    doc.setFontSize(12); doc.text("Factura", 105, 25, {align:"center"});
    doc.setFontSize(11);
    doc.text(`Remito: ${t.remito}`, 15, 40);
    doc.text(`Cliente: ${t.cliente}`, 15, 48);
    doc.text(`Contacto: ${t.contacto||'-'}`, 15, 56);
    doc.text(`Producto/Servicio: ${t.producto}`, 15, 64);
    doc.text(`Descripción: ${t.descripcion||'-'}`, 15, 72);
    doc.text(`Fecha ingreso: ${t.fIngreso}`, 15, 80);
    doc.text(`Fecha salida: ${t.fSalida||hoyISO()}`, 15, 88);
    doc.text(`Forma de pago: ${t.pago}`, 15, 96);

    doc.autoTable({
        startY:105,
        head:[['Monto Total','Pagado','Deuda']],
        body:[[`$${t.montoTotal.toFixed(2)}`,`$${t.montoPagado.toFixed(2)}`,`$${t.saldoPendiente.toFixed(2)}`]],
        styles:{textColor:[0,0,0], halign:'center'},
        headStyles:{fillColor:[255,255,255], textColor:[0,0,0], halign:'center', lineColor:[0,0,0], lineWidth:0.5},
        bodyStyles:{lineColor:[0,0,0], lineWidth:0.5}
    });

    let yPos=130;
    if(t.foto){
        const img1=new Image(); img1.src=t.foto;
        await new Promise(r=>img1.onload=r);
        doc.text("Foto inicial:", 15, yPos-2);
        doc.addImage(img1,'JPEG',15,yPos,60,60);
    }
    if(t.fotoFinal){
        const img2=new Image(); img2.src=t.fotoFinal;
        await new Promise(r=>img2.onload=r);
        doc.text("Foto final:", 90, yPos-2);
        doc.addImage(img2,'JPEG',90,yPos,60,60);
    }

    doc.save(`Factura_${t.cliente.replace(/\s/g,'_')}.pdf`);
}

// Autoload jspdf-autotable
(function(){
    if(!window.jspdf.jsPDF?.autoTable){
        const script = document.createElement('script');
        script.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js";
        document.head.appendChild(script);
    }
})();

cargar();
