/* Офлайн-кэш. Поднимите номер версии, когда обновите index.html. */
var CACHE = "forge-v015";
var FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(FILES); }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){ if(k !== CACHE) return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener("fetch", function(e){
  var u;
  try{ u = new URL(e.request.url); }catch(err){ u = null; }
  if(e.request.method === "POST" && u && /share-target$/.test(u.pathname)){
    e.respondWith(
      e.request.formData().then(function(fd){
        var files = fd.getAll("file") || [], file = null, i;
        for(i=0;i<files.length;i++){ if(files[i] && files[i].size){ file = files[i]; break; } }
        var save = function(txt){
          return caches.open("forge-share").then(function(c){
            return c.put("./shared-payload", new Response(txt, {headers:{"Content-Type":"text/plain; charset=utf-8"}}));
          });
        };
        var p = file ? file.text().then(save)
                     : save([fd.get("url"), fd.get("text"), fd.get("title")].filter(Boolean).join("\n"));
        return p.then(function(){ return Response.redirect("./index.html?share=1", 303); });
      }).catch(function(){ return Response.redirect("./index.html", 303); })
    );
    return;
  }
  if(e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function(hit){
      if(hit) return hit;
      return fetch(e.request).then(function(res){
        if(res && res.status === 200 && res.type === "basic"){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        }
        return res;
      }).catch(function(){ return caches.match("./index.html"); });
    })
  );
});
