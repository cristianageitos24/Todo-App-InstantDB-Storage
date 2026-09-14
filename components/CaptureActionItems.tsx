'use client';
import {ClipboardEvent,KeyboardEvent,useLayoutEffect,useRef} from 'react';
import {Icon} from './WorkUI';

function splitLines(value:string){return value.length?value.split('\n'):[''];}
function parts(line:string){const match=line.match(/^(\s*)(.*)$/);return {prefix:match?.[1]||'',title:match?.[2]||''};}
function indentSpaces(line:string){return (line.match(/^\s*/)?.[0]||'').replace(/\t/g,'  ').length;}

export default function CaptureActionItems({value,onChange,count}:{value:string;onChange:(next:string)=>void;count:number}){
  const lines=splitLines(value);
  const focusAt=useRef<number|null>(null);
  const inputs=useRef<(HTMLInputElement|null)[]>([]);
  const empty=!value.trim();
  const filled=lines.filter(l=>l.trim());
  const base=filled.length?Math.min(...filled.map(indentSpaces)):0;
  useLayoutEffect(()=>{
    const i=focusAt.current;
    if(i==null)return;
    focusAt.current=null;
    const el=inputs.current[i];
    if(!el)return;
    el.focus();
    const end=el.value.length;
    el.setSelectionRange(end,end);
  });
  const commit=(next:string[])=>onChange(next.join('\n'));
  const update=(index:number,nextLine:string)=>commit(lines.map((row,idx)=>idx===index?nextLine:row));
  let root=0;
  const onPaste=(index:number,title:string,prefix:string)=>(e:ClipboardEvent<HTMLInputElement>)=>{
    const text=e.clipboardData.getData('text');
    if(!text.includes('\n')&&!text.includes('\r'))return;
    e.preventDefault();
    const clip=text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');
    const el=e.currentTarget;
    const start=el.selectionStart??title.length;
    const end=el.selectionEnd??title.length;
    const first=prefix+title.slice(0,start)+clip[0];
    const rest=clip.slice(1);
    if(rest.length)rest[rest.length-1]+=title.slice(end);
    commit([...lines.slice(0,index),first,...rest,...lines.slice(index+1)]);
    focusAt.current=index+clip.length-1;
  };
  const onKeyDown=(index:number,line:string,title:string,prefix:string)=>(e:KeyboardEvent<HTMLInputElement>)=>{
    if(e.key==='Enter'){
      e.preventDefault();
      const start=e.currentTarget.selectionStart??title.length;
      commit([...lines.slice(0,index),prefix+title.slice(0,start),title.slice(start),...lines.slice(index+1)]);
      focusAt.current=index+1;
      return;
    }
    if(e.key==='Tab'&&!e.shiftKey){
      e.preventDefault();
      update(index,'  '+line);
      return;
    }
    if(e.key==='Tab'&&e.shiftKey&&/^\s/.test(line)){
      e.preventDefault();
      update(index,line.replace(/^(?:\t| {1,2})/,''));
      return;
    }
    if(e.key==='Backspace'&&!title&&index>0&&(e.currentTarget.selectionStart||0)===0){
      e.preventDefault();
      commit([...lines.slice(0,index),...lines.slice(index+1)]);
      focusAt.current=index-1;
      return;
    }
    if(e.key==='ArrowUp'&&index>0&&(e.currentTarget.selectionStart||0)===0){
      e.preventDefault();
      inputs.current[index-1]?.focus();
      return;
    }
    if(e.key==='ArrowDown'&&index<lines.length-1&&(e.currentTarget.selectionStart||0)>=title.length){
      e.preventDefault();
      inputs.current[index+1]?.focus();
    }
  };
  return <div className="capture-actions">
    <div className="capture-actions-head"><span>Action items</span>{count>0&&<span className="capture-actions-count">{count}</span>}</div>
    <div className="capture-actions-list" role="list">
      {lines.map((line,i)=>{
        const {prefix,title}=parts(line);
        const indent=Math.max(0,indentSpaces(line)-base);
        const nested=indent>0;
        if(!nested)root+=1;
        const number=root;
        return <div className={`capture-action-row${nested?' is-nested':''}`} role="listitem" key={i} style={nested?{paddingLeft:18+Math.min(indent*8,72)}:undefined}>
          {nested?<span className="capture-action-mark"><Icon name="sub" size={13}/></span>:<span className="capture-action-num">{number}</span>}
          <input
            ref={el=>{inputs.current[i]=el;}}
            type="text"
            autoComplete="off"
            value={title}
            maxLength={300}
            placeholder={empty&&i===0?'e.g. Prepare project brief':''}
            aria-label={nested?`Checklist item under action ${number}`:`Action item ${number}`}
            onChange={e=>update(i,prefix+e.target.value.replace(/\n/g,''))}
            onPaste={onPaste(i,title,prefix)}
            onKeyDown={onKeyDown(i,line,title,prefix)}
          />
        </div>;
      })}
    </div>
  </div>;
}
