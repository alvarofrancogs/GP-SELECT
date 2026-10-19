using GpSelect.Domain; using Xunit;
namespace GpSelect.Tests;
public class EnquiryTests {
 static readonly DateTimeOffset Now=new(2026,9,30,12,0,0,TimeSpan.Zero);
 static Enquiry Valid(EnquiryIntent intent=EnquiryIntent.Search,string? name="Ana López",string? email="ana@example.test",string? phone=null,string? vehicle=null,string? message="Busco un coche familiar.",string? budget=null)=>Enquiry.Create(intent,name,email,phone,vehicle,message,Now,budget:budget);
 static string Field(Action create)=>Assert.Throws<DomainException>(create).Field!;

 [Theory]
 [InlineData("delivery", Enquiry.DeliveryMax)]
 [InlineData("year", Enquiry.VehicleYearMax)]
 [InlineData("mileage", Enquiry.MileageMax)]
 [InlineData("timeframe", Enquiry.TimeframeMax)]
 public void Import_details_are_optional_normalized_and_limited(string field, int max)
 {
     Enquiry Create(string? value) => Enquiry.Create(EnquiryIntent.Search, "Ana", "ana@example.test", null, "BMW M4 CS", null, Now,
         delivery: field == "delivery" ? value : null, year: field == "year" ? value : null,
         mileage: field == "mileage" ? value : null, timeframe: field == "timeframe" ? value : null);
     string? Value(Enquiry e) => field switch { "delivery" => e.Delivery, "year" => e.VehicleYear, "mileage" => e.Mileage, _ => e.Timeframe };
     Assert.Null(Value(Create(null)));
     Assert.Null(Value(Create(" \n ")));
     Assert.Equal("one line", Value(Create("  one\n line  ")));
     Assert.Equal(new string('x', max), Value(Create(new string('x', max))));
     Assert.Equal(field, Field(() => Create(new string('x', max + 1))));
     Assert.Equal(field, Field(() => Create("bad\0value")));
 }

 [Fact] public void Valid_enquiry_is_pending_with_created_at(){var e=Valid(phone:"+34 600 000 000");Assert.Equal((EnquiryNotificationStatus.Pending,Now,Now,0),(e.NotificationStatus,e.CreatedAt,e.NotificationNextAttemptAt,e.NotificationAttempts));Assert.Equal("+34 600 000 000",e.Phone);}
 [Fact] public void One_line_fields_collapse_whitespace_and_message_keeps_line_breaks(){var e=Valid(name:"  Ana \n López ",message:"Primera línea\nsegunda línea  ");Assert.Equal("Ana López",e.Name);Assert.Equal("Primera línea\nsegunda línea",e.Message);}
 [Fact] public void Optional_fields_become_null_when_blank(){var e=Valid(phone:"  ",vehicle:"");Assert.Null(e.Phone);Assert.Null(e.Vehicle);}
 [Theory][InlineData(null)][InlineData(" ")][InlineData("A")] public void Name_is_required_with_two_characters(string? name)=>Assert.Equal("name",Field(()=>Valid(name:name)));
 [Fact] public void Name_has_a_maximum()=>Assert.Equal("name",Field(()=>Valid(name:new string('a',Enquiry.NameMax+1))));
 [Theory][InlineData(null)][InlineData("ana")][InlineData("ana@example")][InlineData("ana @example.test")][InlineData("Ana <ana@example.test>")] public void Email_must_be_a_plain_address(string? email)=>Assert.Equal("email",Field(()=>Valid(email:email)));
 [Fact] public void Email_has_a_maximum()=>Assert.Equal("email",Field(()=>Valid(email:new string('a',Enquiry.EmailMax)+"@x.es")));
 [Theory][InlineData("12345")][InlineData("600-abc-000")][InlineData("+1234567890123456")] public void Phone_needs_7_to_15_digits(string phone)=>Assert.Equal("phone",Field(()=>Valid(phone:phone)));
 [Fact] public void Vehicle_is_required_for_a_vehicle_enquiry(){Assert.Equal("vehicle",Field(()=>Valid(intent:EnquiryIntent.Vehicle)));Assert.Equal("porsche-911-x",Valid(intent:EnquiryIntent.Vehicle,vehicle:"porsche-911-x").Vehicle);}
 [Theory][InlineData(null)][InlineData(" ")][InlineData("Corto")] public void Information_message_needs_ten_characters(string? message)=>Assert.Equal("message",Field(()=>Valid(intent:EnquiryIntent.Information,message:message)));
 [Fact] public void Information_accepts_a_message_at_the_minimum()=>Assert.Equal(new string('m',Enquiry.MessageMin),Valid(intent:EnquiryIntent.Information,message:new string('m',Enquiry.MessageMin)).Message);
 [Theory][InlineData(EnquiryIntent.Vehicle)][InlineData(EnquiryIntent.Search)] public void Vehicle_and_search_allow_empty_or_short_messages(EnquiryIntent intent){Assert.Null(Valid(intent:intent,vehicle:"BMW",message:null).Message);Assert.Null(Valid(intent:intent,vehicle:"BMW",message:"  ").Message);Assert.Equal("Sí",Valid(intent:intent,vehicle:"BMW",message:"Sí").Message);}
 [Theory][InlineData(null)][InlineData(" ")][InlineData("A")] public void Search_requires_a_vehicle_or_message(string? vehicle){var error=Assert.Throws<DomainException>(()=>Valid(vehicle:vehicle,message:" "));Assert.Equal("required",error.Code);Assert.Equal("vehicle",error.Field);}
 [Fact] public void Search_accepts_only_a_vehicle(){var e=Valid(vehicle:new string('v',Enquiry.VehicleMin),message:null);Assert.NotNull(e.Vehicle);Assert.Null(e.Message);}
 [Fact] public void Search_accepts_only_a_short_message()=>Assert.Equal("Sí",Valid(message:"Sí").Message);
 [Fact] public void Message_has_a_maximum()=>Assert.Equal("message",Field(()=>Valid(message:new string('m',Enquiry.MessageMax+1))));
 [Fact] public void Budget_has_a_maximum(){Assert.Equal("budget",Field(()=>Valid(budget:new string('b',Enquiry.BudgetMax+1))));Assert.Equal(new string('b',Enquiry.BudgetMax),Valid(budget:new string('b',Enquiry.BudgetMax)).Budget);}
 [Theory][InlineData(EnquiryIntent.Vehicle)][InlineData(EnquiryIntent.Search)][InlineData(EnquiryIntent.Information)] public void Budget_is_one_line_and_kept_for_every_intent(EnquiryIntent intent){Assert.Equal("30.000 € aprox.",Valid(intent:intent,vehicle:"BMW",budget:"  30.000 €\n aprox.  ").Budget);Assert.Null(Valid(intent:intent,vehicle:"BMW",budget:" ").Budget);}
 [Fact] public void Control_characters_are_rejected(){Assert.Equal("name",Field(()=>Valid(name:"Ana\0López")));Assert.Equal("message",Field(()=>Valid(message:"Hola que tal\u0007 bien")));}
 [Fact] public void Unknown_intent_is_rejected()=>Assert.Equal("intent",Field(()=>Valid(intent:(EnquiryIntent)7)));
 [Fact] public void Language_is_spanish_unless_given(){Assert.Equal(EnquiryLanguage.Es,Valid().Language);Assert.Equal(EnquiryLanguage.En,Enquiry.Create(EnquiryIntent.Search,"Ana López","ana@example.test",null,null,"Looking for a family car.",Now,EnquiryLanguage.En).Language);}
 [Fact] public void Unknown_language_is_rejected()=>Assert.Equal("language",Field(()=>Enquiry.Create(EnquiryIntent.Search,"Ana López","ana@example.test",null,null,"Busco un coche familiar.",Now,(EnquiryLanguage)7)));
 [Fact] public void Failed_notifications_back_off_then_stop_without_losing_the_enquiry(){var e=Valid();e.NotificationFailed(Now);Assert.Equal(Now.AddMinutes(1),e.NotificationNextAttemptAt);e.NotificationFailed(Now);Assert.Equal(Now.AddMinutes(5),e.NotificationNextAttemptAt);for(var i=0;i<3;i++)e.NotificationFailed(Now);Assert.Equal(EnquiryNotificationStatus.Pending,e.NotificationStatus);e.NotificationFailed(Now);Assert.Equal((EnquiryNotificationStatus.Failed,Enquiry.MaxNotificationAttempts),(e.NotificationStatus,e.NotificationAttempts));}
 [Fact] public void Sent_notification_is_recorded(){var e=Valid();e.NotificationSent(Now);Assert.Equal((EnquiryNotificationStatus.Sent,Now,1),(e.NotificationStatus,e.NotifiedAt,e.NotificationAttempts));}
}
