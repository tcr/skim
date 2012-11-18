# scrapi - scraping in node.js

Define your scraping parameters in a JSON manifest:

```javascript
var manifest = {
  "base": "http://news.ycombinator.com/",
  "spec": {
    "*": {
      "$query": "td.title ~ td ~ td.title > a",
      "$each": {
        "title": "(text)",
        "link": "(attr href)"
      }
    }
  }
};
```

Create your API:

```javascript
var api = scrapi(manifest);
api('/').get(function (err, json) {
  console.log(json);
})
```

Result:

```javascript
[ { link: 'https://www.hackerschool.com/blog/5-learning-c-with-gdb',
    title: 'Learning C with gdb' },
  { link: 'http://blogs.scientificamerican.com/guest-blog/2012/08/27/the-hidden-truths-about-calories/',
    title: 'Hidden Truths about Calories' },
  { link: 'http://cantada.ca/',
    title: 'Can\'tada - Tracking the stuff you can\'t use in Canada' },
  { link: 'https://blog.gregbrockman.com/2012/08/system-design-stripe-capture-the-flag/',
    title: 'Seccuring Stripe\'s Capture the Flag' },
  { link: 'http://swanson.github.com/blog/2012/08/27/move-your-feet.html',
    title: 'Move your feet' },
    ... ]
```