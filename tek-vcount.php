<?php
header('Expires: Sun, 01 Jan 2000 00:00:00 GMT');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Cache-Control: post-check=0, pre-check=0', FALSE);
header('Pragma: no-cache');
setcookie('Cache-Buster', time(), time()+60*60*24*30, '/', 'teknixstuff.com');
//$file = '/var/www/counts/' . preg_replace('/[^a-zA-Z0-9_-]/s', '_', $_GET["id"]) . '.txt';
//file_put_contents($file, file_get_contents($file) + 1);