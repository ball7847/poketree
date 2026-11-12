/* Pokémon's 25 standard natures. HP is never nature-modified. */
window.POKE_NATURES = Object.freeze({
 hardy:{name:"노력",up:null,down:null},lonely:{name:"외로움",up:"attack",down:"defense"},brave:{name:"용감",up:"attack",down:"speed"},
 adamant:{name:"고집",up:"attack",down:"spAttack"},naughty:{name:"개구쟁이",up:"attack",down:"spDefense"},
 bold:{name:"대담",up:"defense",down:"attack"},docile:{name:"온순",up:null,down:null},
 relaxed:{name:"무사태평",up:"defense",down:"speed"},impish:{name:"장난꾸러기",up:"defense",down:"spAttack"},
 lax:{name:"촐랑",up:"defense",down:"spDefense"},timid:{name:"겁쟁이",up:"speed",down:"attack"},
 hasty:{name:"성급",up:"speed",down:"defense"},serious:{name:"성실",up:null,down:null},
 jolly:{name:"명랑",up:"speed",down:"spAttack"},naive:{name:"천진난만",up:"speed",down:"spDefense"},
 modest:{name:"조심",up:"spAttack",down:"attack"},mild:{name:"의젓",up:"spAttack",down:"defense"},
 quiet:{name:"냉정",up:"spAttack",down:"speed"},bashful:{name:"수줍음",up:null,down:null},
 rash:{name:"덜렁",up:"spAttack",down:"spDefense"},calm:{name:"차분",up:"spDefense",down:"attack"},
 gentle:{name:"얌전",up:"spDefense",down:"defense"},sassy:{name:"건방",up:"spDefense",down:"speed"},
 careful:{name:"신중",up:"spDefense",down:"spAttack"},quirky:{name:"변덕",up:null,down:null}
});