

var restify = require('restify')
var builder = require('botbuilder')

// Setup Restify Server a
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function(){
    console.log('%s listenting to %s',server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

// Listen for message from users
server.post('/api/messages',connector.listen());

// Receive messages from the user and respond by echoing each message back (prefixed with 'You said')
var bot = new builder.UniversalBot(connector, function(session){
    session.send('You said: %s', session.message.text);
});

// Install a custom recognizer to look for user saying 'help' or 'goodbye'.
bot.recognizer({
    recognize: function (context, done) {
    var intent = { score: 0.0 };
  
          if (context.message.text) {
              switch (context.message.text.toLowerCase()) {
                  case 'help':
                      intent = { score: 1.0, intent: 'Help' };
                      break;
                  case 'goodbye':
                      intent = { score: 1.0, intent: 'Goodbye' };
                      break;
              }
          }
          done(null, intent);
      }
  });

  // Add a help dialog with a trigger action that is bound to the 'Help' intent
  bot.dialog('helpDialog', function (session) {
      session.endDialog("This bot will echo back anything you say. Say 'List|Show' for showing and Say 'goodbye' to quit.");
  }).triggerAction({ matches: 'Help' });
  
  
  // Add a global endConversation() action that is bound to the 'Goodbye' intent
  bot.endConversationAction('goodbyeAction', "Ok... See you later.", { matches: 'Goodbye' });

// Add dialog to return list of shirts available
bot.dialog('showShirts', function(session){
    var msg = new builder.Message(session)
    msg.attachmentLayout(builder.AttachmentLayout.carousel)
    msg.attachments([
        new builder.HeroCard(session)
        .title("Classic White T-Shirt")
        .subtitle("100% soft and Luxurious Cotton")
        .text("Price is $25 and carried in sizes (S, M, L, and XL)")
        .images([builder.CardImage.create(session,'http://petersapparel.parseapp.com/img/whiteshirt.png')])
        .buttons([
            builder.CardAction.imBack(session, "buy classic white t-shirt", "Buy")
        ]),
        new builder.HeroCard(session)
        .title("Classic Gray T-Shirt")
        .subtitle("100% soft and luxurious cotton")
        .text("Price is $25 and carried in sizes (S, M, L, and XL)")
        .images([builder.CardAction.imBack(session, "buy classic gray t-shirt", "Buy")])
        .buttons([
            builder.CardAction.imBack(session, "buy classic grey t-shirt", "Buy")
        ])
    ]);
    session.send(msg).endDialog();
}).triggerAction({matches: /^(show|list)/i});


// Add dialog to handle 'Buy' button click
bot.dialog('buyButtonClick',[
    function (session,args,next) {
        //Get color and optional size from users utterance
        var utterance = args.intent.matched[0];
        var color = /(white|grey)/i.exec(utterance);
        var size = /\b(Extra Large |Large|Medium|Small)\b/i.exec(utterance);
        if(color) {
            // Initialize cart item
            var item = session.dialogData.item = {
                product: "classic " + color[0].toLowerCase() + " t-shirt",
                size: size ? size[0].toLowerCase() : null,
                price: 25.0,
                qty: 1
            };
            if(!item.size) {
                //Prompt for size
                builder.Prompts.choice(session, "What size would your like?", "Small|Medium|Large|Extra Large");
            }else {
                //Skip to next waterfall step
                next();
            }
        }
            else {
                //Invalid product
                session.send("I'm sorry.... that product wasn't found.").endDialog();
            }
        },
        function(session, results) {
            //save size if prompted
            var item = session.dialogData.item;
            if(results.response) {
                item.size = results.response.entity.toLowerCase();
            }

            // Add to cart
            if(!session.userData.cart) {
                session.userData.cart = [];
            }
            session.userData.cart.push(item);

            // send confirmation to users
            session.send("A '%(size)s %(product)s' has been added to your cart.", item).endDialog();
        }
]).triggerAction({matches: /(buy|add)\s.*shirt/i});
