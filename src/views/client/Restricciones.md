Puedes usar esta lista de caracteres especiales para validar contraseñas y evitar que alguien ponga solo símbolos repetidos o secuencias raras:

```txt
! @ # $ % ^ & * ( ) - _ = + [ ] { } \ | ; : ' " , . < > / ? ` ~ ¡ ¿ ¬ ° ¨ ´ + * } { ] [ ) ( - _ = + § ¶ © ® ™ € £ ¥ ¢
```

ejemplos de combinaciones “basura” que mucha gente pone:

```txt
*}{-{+{´+{ 
!!!! 
@@@@ 
1234 
abcd 
qwerty 
asdf 
%%%% 
&&&& 
---- 
____ 
++++ 
(((( 
)))) 
{{{{ 
}}}} 
|||| 
//// 
\\\\ 
~~~~ 
```

También puedes aplicar reglas como:

* mínimo 8 caracteres
* al menos:

  * 1 mayúscula
  * 1 minúscula
  * 1 número
  * 1 símbolo
* no permitir:

  * caracteres repetidos (`aaaa`, `1111`, `!!!!`)
  * secuencias (`1234`, `abcd`, `qwerty`)
  * solo símbolos (`@@@@@@`)
  * espacios

Ejemplo regex fuerte:

```regex
^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{}\\|;:'",.<>\/?`~¡¿¬°¨´]).{8,}$
```
