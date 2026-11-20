import test from 'node:test';
import assert from 'node:assert/strict';
import {apply,context,create,input,view} from '../src/engine.js';

const campaign=()=>create('Treino',{name:'Kaien Sarutobi',age:7});
const action=text=>input({segments:[{type:'AGIR',text}]});
const training='A claridade da manhã avança sobre Konoha enquanto Kaien se dirige ao pátio da residência Sarutobi para retomar os treinos práticos com o estilo Raio. Durante as oito horas seguintes, o esforço se concentra em refinar o fluxo elétrico na lâmina restrita. O progresso é visível na precisão dos cortes desferidos contra os alvos de madeira, embora o desgaste físico exija pausas calculadas para recuperar o fôlego e o equilíbrio do chakra.';

test('o treino do exemplo deixa a ficha cansada mesmo quando o narrador manda delta zero',()=>{
 const old=campaign();
 const next=apply(old,action('Retomo os treinos práticos do estilo Raio.'),{narrative:training,energyDelta:0,elapsedHours:8});
 assert.equal(view(next).conditions.energy,'cansado');
 assert.ok(next.energy<old.energy);
 assert.deepEqual(next.databook.ratings,old.databook.ratings);
 const conversation=apply(next,action('Escuto Hiruzen.'),{narrative:'Hiruzen comenta a precisão dos cortes.'});
 assert.equal(view(conversation).conditions.energy,'cansado');
 assert.equal(conversation.energy,next.energy);
});

test('saves antigos corrigem a ficha e o próximo turno, sem cobrar desgaste repetido',()=>{
 const old=campaign();
 old.messages.push({role:'ai',text:training,day:old.day});
 assert.equal(view(old).conditions.energy,'cansado');
 assert.equal(context(old,action('Escuto Hiruzen.')).conditions.energy,'cansado');
 assert.equal(old.energy,100);
 const next=apply(old,action('Escuto Hiruzen.'),{narrative:'Hiruzen comenta a precisão dos cortes.'});
 assert.equal(next.energy,49);
 assert.equal(view(next).conditions.energy,'cansado');
});

test('distingue exaustão, desgaste de um NPC, previsão e recuperação confirmada',()=>{
 const old=campaign();
 const exhausted=apply(old,action('Encerro a prática.'),{narrative:'Kaien ficou exausto ao fim do exercício.',energyDelta:0});
 assert.equal(view(exhausted).conditions.energy,'exausto');
 const recovered=apply(exhausted,action('Durmo até a manhã seguinte.'),{
  narrative:'Kaien dormiu durante a noite. Kaien acordou descansado.',elapsedDays:1
 });
 assert.equal(view(recovered).conditions.energy,'descansado');
 for(const narrative of ['Hiruzen está cansado e pede uma pausa a Kaien.',
  'Se Kaien ficar cansado, Hiruzen sugere uma pausa.',
  'Kaien não ficou cansado durante o exercício.']){
  assert.equal(apply(old,action('Escuto Hiruzen.'),{narrative}).energy,100);
 }
});
